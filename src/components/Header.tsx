interface Props {
  title: string;
  hasHistory: boolean;
  userEmail: string | null;
  onClear: () => void;
  onSignOut: () => void;
}

export function Header({
  title,
  hasHistory,
  userEmail,
  onClear,
  onSignOut,
}: Props) {
  return (
    <div className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex w-20 items-center">
          {userEmail && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
              aria-label="تسجيل خروج"
              title={userEmail}
            >
              🚪
            </button>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <div className="flex w-20 items-center justify-end">
          {hasHistory && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
              aria-label="مسح المحادثة"
            >
              🔄
            </button>
          )}
        </div>
      </div>
      {userEmail && (
        <div className="border-t border-slate-100 px-4 py-1 text-center text-xs text-slate-400" dir="ltr">
          {userEmail}
        </div>
      )}
    </div>
  );
}
