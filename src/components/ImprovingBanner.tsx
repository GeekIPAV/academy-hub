import { HardHat } from "lucide-react";

/**
 * Banner global: "Estamos a melhorar esta página".
 * Ícone animado simples (pessoas a trabalhar numa ponte estilizada em SVG).
 */
export function ImprovingBanner() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 shadow-sm">
      <BridgeWorkersIcon className="h-8 w-12 shrink-0" />
      <p className="text-sm font-medium">Estamos a melhorar esta página</p>
    </div>
  );
}

function BridgeWorkersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Ponte */}
      <line x1="2" y1="32" x2="62" y2="32" />
      <line x1="8" y1="32" x2="8" y2="38" />
      <line x1="32" y1="32" x2="32" y2="38" />
      <line x1="56" y1="32" x2="56" y2="38" />
      {/* Arcos da ponte */}
      <path d="M2 32 Q 17 22 32 32" opacity="0.5" />
      <path d="M32 32 Q 47 22 62 32" opacity="0.5" />

      {/* Trabalhador 1 - acena com martelo */}
      <g>
        <circle cx="18" cy="20" r="2.5" />
        <line x1="18" y1="22.5" x2="18" y2="28" />
        <line x1="18" y1="28" x2="15" y2="32" />
        <line x1="18" y1="28" x2="21" y2="32" />
        <line x1="18" y1="25" x2="14" y2="26" />
        {/* Braço/martelo a oscilar */}
        <g style={{ transformOrigin: "18px 25px", animation: "hammer 1.2s ease-in-out infinite" }}>
          <line x1="18" y1="25" x2="23" y2="22" />
          <rect x="22" y="19" width="3" height="4" rx="0.5" />
        </g>
      </g>

      {/* Trabalhador 2 */}
      <g>
        <circle cx="44" cy="20" r="2.5" />
        <line x1="44" y1="22.5" x2="44" y2="28" />
        <line x1="44" y1="28" x2="41" y2="32" />
        <line x1="44" y1="28" x2="47" y2="32" />
        <line x1="44" y1="25" x2="48" y2="26" />
        <g style={{ transformOrigin: "44px 25px", animation: "hammer 1.2s ease-in-out infinite 0.6s" }}>
          <line x1="44" y1="25" x2="40" y2="22" />
          <rect x="38" y="19" width="3" height="4" rx="0.5" />
        </g>
      </g>

      <style>{`
        @keyframes hammer {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(25deg); }
        }
      `}</style>
    </svg>
  );
}
