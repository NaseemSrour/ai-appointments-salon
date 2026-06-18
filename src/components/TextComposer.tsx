import { type FormEvent, useState } from 'react';

// Bottom text input bar — the typed counterpart to MicButton.

interface Props {
  onSend: (text: string) => void;
  busy: boolean;
  placeholder?: string;
}

export function TextComposer({ onSend, busy, placeholder }: Props) {
  const [text, setText] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText('');
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 bg-[#f0f2f5] px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? 'اكتب رسالتك...'}
        enterKeyHint="send"
        className="flex-1 rounded-full bg-white px-4 py-3 text-base shadow-sm focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-xl text-white shadow transition active:scale-95 disabled:opacity-50"
        aria-label="إرسال"
      >
        {busy ? '⏳' : '➤'}
      </button>
    </form>
  );
}
