// Voice / text segmented toggle. Lives just above the bottom input control.

export type ChatMode = 'voice' | 'text';

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const OPTIONS: { id: ChatMode; label: string; icon: string }[] = [
  { id: 'voice', label: 'صوت', icon: '🎙️' },
  { id: 'text', label: 'كتابة', icon: '⌨️' },
];

export function ModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <div className="flex justify-center bg-white pt-2">
      <div className="inline-flex rounded-full bg-slate-100 p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              mode === o.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="ml-1">{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
