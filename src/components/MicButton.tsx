import type { RealtimeStatus } from '../lib/realtime';

interface Props {
  status: RealtimeStatus;
  connected: boolean;
  onClick: () => void;
}

// Full-width rectangular mic button intended to live at the bottom of the
// screen. State-aware visuals + Palestinian-Arabic labels.
const visuals: Record<
  RealtimeStatus,
  { color: string; label: string; icon: string }
> = {
  idle: { color: 'bg-blue-600', label: 'إكبس وابدأ', icon: '🎙️' },
  connecting: { color: 'bg-amber-600', label: 'عم اتصل...', icon: '⏳' },
  listening: { color: 'bg-red-600', label: 'عم اسمعك', icon: '🎤' },
  thinking: { color: 'bg-amber-600', label: 'ثانية...', icon: '💭' },
  speaking: { color: 'bg-green-600', label: 'عم احكي', icon: '🔊' },
  error: { color: 'bg-slate-500', label: 'في مشكلة', icon: '⚠️' },
};

export function MicButton({ status, connected, onClick }: Props) {
  const v = visuals[status];
  const label = connected && status === 'idle' ? 'احكي' : v.label;
  const finalLabel = !connected ? 'إكبس وابدأ' : label;
  const live = status === 'listening';

  return (
    <div className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] pt-3">
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onClick}
          className={`flex h-24 w-full items-center justify-center gap-4 rounded-3xl text-white shadow-lg transition active:scale-95 ${v.color} ${
            live ? 'animate-pulse' : ''
          }`}
        >
          <span className="text-3xl">{v.icon}</span>
          <span className="text-xl font-bold">{finalLabel}</span>
        </button>
      </div>
    </div>
  );
}
