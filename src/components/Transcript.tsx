export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  turns: Turn[];
  emptyHint?: string;
  emptyExample?: string;
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
    <div className="space-y-3 px-4 py-4">
      {turns.map((t, i) => (
        <div
          key={i}
          className={
            t.role === 'user'
              ? 'mr-auto max-w-[80%] rounded-2xl bg-slate-200 px-4 py-2 text-slate-900'
              : 'ml-auto max-w-[80%] rounded-2xl bg-blue-600 px-4 py-2 text-white shadow-sm'
          }
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
