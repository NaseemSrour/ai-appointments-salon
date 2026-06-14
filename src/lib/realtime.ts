// Thin client around OpenAI's Realtime API over WebRTC.
//
// Why WebRTC, not WebSocket:
//   The browser's WebRTC stack handles mic PCM capture, encoding, jitter
//   buffering, echo cancellation, packet-loss concealment, and remote audio
//   playback FOR US. WebRTC = ~50 lines of glue; WebSocket = ~500.
//
// Auth model:
//   The browser-only flow mints an ephemeral key from
//   /v1/realtime/client_secrets using your API key, then uses the ephemeral
//   key for the SDP exchange. Yes, your real key still appears in the
//   browser bundle — that's a prototype-only compromise. Ship behind a
//   small backend (e.g., Firebase Function) before going public.

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface ToolCall {
  name: string;
  args: unknown;
  call_id: string;
}

export interface RealtimeClientOptions {
  apiKey: string;
  model: string;
  voice: string;
  instructions: string;
  tools: unknown[];
  onStatus?: (s: RealtimeStatus) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onToolCall?: (call: ToolCall) => Promise<unknown>;
  onError?: (err: string) => void;
}

interface RealtimeEvent {
  type: string;
  [k: string]: unknown;
}

export class RealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private opts: RealtimeClientOptions;
  private status: RealtimeStatus = 'idle';
  private assistantTextBuf = new Map<string, string>();
  private toolArgsBuf = new Map<string, { name: string; args: string }>();

  constructor(opts: RealtimeClientOptions) {
    this.opts = opts;
  }

  private setStatus(s: RealtimeStatus) {
    if (this.status === s) return;
    this.status = s;
    this.opts.onStatus?.(s);
  }

  async connect(): Promise<void> {
    this.setStatus('connecting');

    try {
      // 1. Mint ephemeral token. In production: do this server-side.
      const tokenResp = await fetch(
        'https://api.openai.com/v1/realtime/client_secrets',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.opts.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session: {
              type: 'realtime',
              model: this.opts.model,
              audio: { output: { voice: this.opts.voice } },
            },
          }),
        },
      );

      if (!tokenResp.ok) {
        const err = await tokenResp.text();
        throw new Error(`Token request failed (${tokenResp.status}): ${err}`);
      }

      const tokenData = (await tokenResp.json()) as {
        value?: string;
        client_secret?: { value: string };
      };
      const ephemeralKey = tokenData.value ?? tokenData.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key in token response');

      // 2. Peer connection + remote audio playback element.
      this.pc = new RTCPeerConnection();
      this.audioEl = new Audio();
      this.audioEl.autoplay = true;
      this.pc.ontrack = (e) => {
        if (this.audioEl) this.audioEl.srcObject = e.streams[0];
      };

      // 3. Mic as local track.
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Microphone unavailable. Open this page over HTTPS or on localhost — getUserMedia is blocked on plain http://LAN addresses.',
        );
      }
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      for (const t of this.localStream.getAudioTracks()) {
        this.pc.addTrack(t, this.localStream);
      }

      // 4. Data channel for control + tool events.
      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.addEventListener('open', () => this.configureSession());
      this.dc.addEventListener('message', (e) => this.handleEvent(e.data));

      // 5. SDP offer/answer with the OpenAI realtime endpoint.
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sdpResp = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(this.opts.model)}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        },
      );

      if (!sdpResp.ok) {
        const err = await sdpResp.text();
        throw new Error(`SDP exchange failed (${sdpResp.status}): ${err}`);
      }

      const answerSdp = await sdpResp.text();
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      this.setStatus('listening');
    } catch (e) {
      this.setStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      this.opts.onError?.(msg);
      await this.disconnect();
      throw e;
    }
  }

  private configureSession() {
    this.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: this.opts.instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,
            },
          },
          output: {
            voice: this.opts.voice,
            format: { type: 'audio/pcm', rate: 24000 },
          },
        },
        tools: this.opts.tools,
        tool_choice: 'auto',
      },
    });
  }

  send(event: RealtimeEvent) {
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.dc.send(JSON.stringify(event));
  }

  private async handleEvent(raw: unknown) {
    let evt: RealtimeEvent;
    try {
      evt = JSON.parse(raw as string) as RealtimeEvent;
    } catch {
      return;
    }

    switch (evt.type) {
      case 'input_audio_buffer.speech_started':
        this.setStatus('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.setStatus('thinking');
        break;

      case 'response.audio.delta':
        if (this.status !== 'speaking') this.setStatus('speaking');
        break;

      case 'response.audio.done':
        this.setStatus('listening');
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const text = (evt.transcript as string) ?? '';
        if (text.trim()) this.opts.onTranscript?.('user', text.trim());
        break;
      }

      case 'response.audio_transcript.delta': {
        const itemId = (evt.item_id as string) ?? 'pending';
        const prev = this.assistantTextBuf.get(itemId) ?? '';
        this.assistantTextBuf.set(itemId, prev + ((evt.delta as string) ?? ''));
        break;
      }

      case 'response.audio_transcript.done': {
        const itemId = (evt.item_id as string) ?? 'pending';
        const text =
          (evt.transcript as string) ??
          this.assistantTextBuf.get(itemId) ??
          '';
        this.assistantTextBuf.delete(itemId);
        if (text.trim()) this.opts.onTranscript?.('assistant', text.trim());
        break;
      }

      case 'response.function_call_arguments.delta': {
        const callId = (evt.call_id as string) ?? '';
        const existing = this.toolArgsBuf.get(callId);
        const name = (evt.name as string) ?? existing?.name ?? '';
        const args = (existing?.args ?? '') + ((evt.delta as string) ?? '');
        this.toolArgsBuf.set(callId, { name, args });
        break;
      }

      case 'response.function_call_arguments.done': {
        const callId = (evt.call_id as string) ?? '';
        const buf = this.toolArgsBuf.get(callId);
        const name = (evt.name as string) ?? buf?.name ?? '';
        const argsStr = (evt.arguments as string) ?? buf?.args ?? '{}';
        this.toolArgsBuf.delete(callId);
        console.log('[realtime] tool call complete:', name, argsStr);
        await this.runTool(callId, name, argsStr);
        break;
      }

      case 'error': {
        const e = evt.error as { message?: string } | undefined;
        this.opts.onError?.(e?.message ?? 'unknown realtime error');
        break;
      }

      default:
        break;
    }
  }

  private async runTool(call_id: string, name: string, argsStr: string) {
    let args: unknown = {};
    try {
      args = JSON.parse(argsStr || '{}');
    } catch {
      // leave as empty object
    }

    let output: unknown = { error: 'no handler' };
    if (this.opts.onToolCall) {
      try {
        output = await this.opts.onToolCall({ name, args, call_id });
      } catch (e) {
        output = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify(output),
      },
    });
    this.send({ type: 'response.create' });
  }

  async disconnect() {
    try { this.dc?.close(); } catch { /* ignore */ }
    try { this.pc?.close(); } catch { /* ignore */ }
    try {
      this.localStream?.getTracks().forEach((t) => t.stop());
    } catch { /* ignore */ }
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.dc = null;
    this.pc = null;
    this.localStream = null;
    this.assistantTextBuf.clear();
    this.toolArgsBuf.clear();
    this.setStatus('idle');
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }
}
