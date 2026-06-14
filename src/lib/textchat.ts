// Text-chat driver — the typed counterpart to RealtimeClient.
//
// Same contract as voice: it's handed the same `instructions`, `tools`, and
// `onToolCall` as the realtime client, so the entire domain layer (tool
// handlers, intake state, ResultPanel) is reused unchanged. The only
// difference is the transport: a normal request/response tool-calling loop on
// OpenAI's Responses API instead of a live WebRTC audio stream.
//
// Why typed input matters here: phone numbers, names, and mid-sentence Hebrew
// are captured exactly as written instead of being guessed by speech-to-text.
//
// Auth: like realtime.ts this calls OpenAI directly with the browser key —
// prototype only. In production, proxy this through the same backend that
// mints the realtime ephemeral token (see DEVELOPMENT.md).

export type TextStatus = 'idle' | 'thinking' | 'error';

export interface TextClientOptions {
  apiKey: string;
  model: string;
  instructions: string;
  tools: unknown[];
  onStatus?: (s: TextStatus) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onToolCall?: (call: { name: string; args: unknown }) => Promise<unknown>;
  onError?: (err: string) => void;
}

interface FunctionCall {
  call_id: string;
  name: string;
  arguments: string;
}

interface ResponsesPayload {
  id?: string;
  output?: Array<{
    type: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
  output_text?: string;
}

const MAX_TOOL_HOPS = 8;

export class TextClient {
  private opts: TextClientOptions;
  // The Responses API stores each turn server-side; chaining by id means we
  // only send new items each hop instead of resending the whole transcript.
  private lastResponseId: string | null = null;
  private busy = false;

  constructor(opts: TextClientOptions) {
    this.opts = opts;
  }

  /** Send one typed user message and run the tool loop to a final reply. */
  async send(userText: string): Promise<void> {
    const text = userText.trim();
    if (!text || this.busy) return;

    this.opts.onTranscript?.('user', text);
    this.busy = true;
    this.opts.onStatus?.('thinking');

    try {
      let input: unknown[] = [{ role: 'user', content: text }];

      for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
        const data = await this.createResponse(input);
        this.lastResponseId = data.id ?? this.lastResponseId;

        const { assistantText, toolCalls } = parseOutput(data);
        if (assistantText) this.opts.onTranscript?.('assistant', assistantText);

        if (toolCalls.length === 0) break;

        // Run each tool through the shared domain handler, feed results back.
        const outputs = [];
        for (const tc of toolCalls) {
          let args: unknown = {};
          try {
            args = JSON.parse(tc.arguments || '{}');
          } catch {
            // leave as empty object
          }
          let result: unknown = { error: 'no handler' };
          if (this.opts.onToolCall) {
            try {
              result = await this.opts.onToolCall({ name: tc.name, args });
            } catch (e) {
              result = { error: e instanceof Error ? e.message : String(e) };
            }
          }
          outputs.push({
            type: 'function_call_output',
            call_id: tc.call_id,
            output: JSON.stringify(result),
          });
        }
        input = outputs;
      }

      this.opts.onStatus?.('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.opts.onError?.(msg);
      this.opts.onStatus?.('error');
    } finally {
      this.busy = false;
    }
  }

  /** Forget the conversation context (e.g. when the transcript is cleared). */
  reset(): void {
    this.lastResponseId = null;
  }

  private async createResponse(input: unknown[]): Promise<ResponsesPayload> {
    const body: Record<string, unknown> = {
      model: this.opts.model,
      instructions: this.opts.instructions,
      input,
      tools: this.opts.tools,
      tool_choice: 'auto',
      store: true,
    };
    if (this.lastResponseId) body.previous_response_id = this.lastResponseId;

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Responses API failed (${resp.status}): ${err}`);
    }
    return (await resp.json()) as ResponsesPayload;
  }
}

function parseOutput(data: ResponsesPayload): {
  assistantText: string;
  toolCalls: FunctionCall[];
} {
  const toolCalls: FunctionCall[] = [];
  let assistantText = '';

  for (const item of data.output ?? []) {
    if (item.type === 'function_call' && item.call_id && item.name) {
      toolCalls.push({
        call_id: item.call_id,
        name: item.name,
        arguments: item.arguments ?? '{}',
      });
    } else if (item.type === 'message') {
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' && c.text) assistantText += c.text;
      }
    }
  }
  if (!assistantText && typeof data.output_text === 'string') {
    assistantText = data.output_text;
  }
  return { assistantText, toolCalls };
}
