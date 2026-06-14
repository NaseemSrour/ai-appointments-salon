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
      className="flex items-end gap-2 border-t border-slate-200 bg-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? 'اكتب رسالتك...'}
        enterKeyHint="send"
        className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow transition active:scale-95 disabled:opacity-40"
        aria-label="إرسال"
      >
        {busy ? '⏳' : '➤'}
      </button>
    </form>
  );
}
