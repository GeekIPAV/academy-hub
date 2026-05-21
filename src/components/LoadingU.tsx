export function LoadingU() {
  // Path length ≈ 45 + π*30 + 45 ≈ 184; use 190 for safety.
  const len = 190;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <svg width="120" height="120" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        {/* Dot at the start of the U stroke */}
        <circle cx="20" cy="10" r="5" className="fill-primary loading-u-dot" />
        {/* The U stroke, drawn from the start point */}
        <path
          d="M 20 10 L 20 55 A 30 30 0 0 0 80 55 L 80 10"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-primary loading-u-path"
          style={{ strokeDasharray: len, strokeDashoffset: len }}
        />
      </svg>
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}
