interface Props {
  title: string;
  avatarEmoji?: string;
  hasHistory: boolean;
  userEmail: string | null;
  onClear: () => void;
  onSignOut: () => void;
}

export function Header({
  title,
  avatarEmoji,
  hasHistory,
  userEmail,
  onClear,
  onSignOut,
}: Props) {
  return (
    <div className="bg-[#008069] text-white shadow-sm">
      <div className="flex items-center gap-2 px-2 py-2">
        {userEmail && (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full p-2 text-white/90 hover:bg-white/10"
            aria-label="تسجيل خروج"
            title={userEmail}
          >
            🚪
          </button>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl">
          {avatarEmoji ?? '💬'}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {title}
          </h1>
          <p className="text-xs text-white/80">متصل</p>
        </div>
        {hasHistory && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full p-2 text-white/90 hover:bg-white/10"
            aria-label="مسح المحادثة"
          >
            🔄
          </button>
        )}
      </div>
    </div>
  );
}
