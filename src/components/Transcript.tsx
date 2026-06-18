export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  at?: number;
}

interface Props {
  turns: Turn[];
  emptyHint?: string;
  emptyExample?: string;
}

function formatTime(at?: number) {
  const d = at ? new Date(at) : new Date();
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function Transcript({ turns, emptyHint, emptyExample }: Props) {
  if (turns.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-slate-500">
        <p className="text-base">{emptyHint ?? 'إكبس عالميكروفون واحكي'}</p>
        {emptyExample && (
          <p className="mt-2 text-sm">جرّب: «{emptyExample}»</p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 px-3 py-4">
      {turns.map((t, i) => {
        const isUser = t.role === 'user';
        return (
          <div
            key={i}
            className={
              isUser
                ? 'bubble-out ml-auto flex max-w-[80%] flex-col rounded-lg rounded-tr-none px-2.5 py-1.5 text-[15px] text-slate-900 shadow-sm'
                : 'bubble-in mr-auto flex max-w-[80%] flex-col rounded-lg rounded-tl-none px-2.5 py-1.5 text-[15px] text-slate-900 shadow-sm'
            }
          >
            <span className="whitespace-pre-wrap break-words leading-snug">
              {t.text}
            </span>
            <span className="mt-0.5 flex items-center gap-1 self-end text-[11px] text-slate-500">
              {formatTime(t.at)}
              {isUser && <span className="text-sky-500">✓✓</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
