type DebateArenaLogoProps = {
  compact?: boolean;
};

export function DebateArenaLogo({ compact = false }: DebateArenaLogoProps) {
  return (
    <div className={`flex items-center gap-4 ${compact ? "" : "flex-col text-center"}`}>
      <svg
        viewBox="0 0 260 220"
        aria-hidden="true"
        className={compact ? "h-16 w-16 shrink-0" : "h-44 w-44"}
      >
        <defs>
          <linearGradient id="arena-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ac7ff" />
            <stop offset="55%" stopColor="#6788ff" />
            <stop offset="100%" stopColor="#b33cff" />
          </linearGradient>
          <linearGradient id="arena-podium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#29c5ff" />
            <stop offset="50%" stopColor="#325cff" />
            <stop offset="100%" stopColor="#7a1fff" />
          </linearGradient>
          <linearGradient id="arena-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#163a9a" />
            <stop offset="100%" stopColor="#140b5c" />
          </linearGradient>
          <filter id="arena-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <ellipse cx="130" cy="190" rx="90" ry="10" fill="#6119cc" opacity="0.45" />
        <ellipse
          cx="130"
          cy="64"
          rx="58"
          ry="48"
          fill="url(#arena-glow)"
          opacity="0.28"
          filter="url(#arena-shadow)"
        />
        <circle cx="100" cy="60" r="36" fill="none" stroke="#f4fbff" strokeWidth="5" />
        <circle cx="158" cy="60" r="36" fill="none" stroke="#f4fbff" strokeWidth="5" />
        <line x1="129" y1="28" x2="129" y2="96" stroke="#f4fbff" strokeWidth="5" />

        <path
          d="M87 78c6-7 6-14 0-20m15 28c7-7 8-16 2-25m54 17c-5-8-5-15 0-21m-15 29c-6-7-8-16-2-25"
          fill="none"
          stroke="#f4fbff"
          strokeLinecap="round"
          strokeWidth="4"
        />

        <path d="M92 96h74v22H92z" fill="url(#arena-glow)" stroke="#231a7b" strokeWidth="4" />
        <path d="M104 118h50v76h-50c10-18 11-55 0-76Z" fill="url(#arena-dark)" />
        <path d="M92 118h18v76H92c9-17 10-55 0-76Z" fill="#1d7be8" />
        <path d="M154 118h12v76h-12z" fill="url(#arena-podium)" opacity="0.95" />
        <path d="M90 116l-18 12v16l21-10z" fill="#2aaeff" stroke="#1d2f8e" strokeWidth="4" />
        <path d="M78 112c10-6 18-1 20 8" fill="none" stroke="#153287" strokeWidth="4" />
        <circle cx="78" cy="112" r="5" fill="#44d5ff" stroke="#17358f" strokeWidth="3" />

        <path
          d="M43 186c48 25 127 26 174 0"
          fill="none"
          stroke="url(#arena-podium)"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>

      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        <div className="arena-wordmark text-[2rem] font-black leading-none tracking-[0.12em] text-transparent md:text-[4rem]">
          DEBATE
        </div>
        <div className="arena-submark text-[1.05rem] font-black leading-none tracking-[0.38em] text-transparent md:text-[2rem]">
          ARENA
        </div>
      </div>
    </div>
  );
}
