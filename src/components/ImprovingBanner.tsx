import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * É um componente como os outros: a visibilidade é controlada pela matriz de
 * acessos do admin (componente "improving-banner" em cada página).
 */
export function ImprovingBanner() {
  const { isComponentVisible } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isComponentVisible(pathname, "improving-banner")) {
    return null;
  }

  return (
    <div className="mt-8 flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900 shadow-sm">
      <BridgeWorkersIcon className="h-14 w-28 shrink-0" />
      <p className="text-base font-semibold">Estamos a melhorar esta página</p>
    </div>
  );
}

function BridgeWorkersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Ponte */}
      <line x1="4" y1="38" x2="116" y2="38" />
      <line x1="12" y1="38" x2="12" y2="46" />
      <line x1="38" y1="38" x2="38" y2="46" />
      <line x1="62" y1="38" x2="62" y2="46" />
      <line x1="86" y1="38" x2="86" y2="46" />
      <line x1="108" y1="38" x2="108" y2="46" />
      {/* Arcos da ponte */}
      <path d="M4 38 Q 22 26 38 38" opacity="0.45" />
      <path d="M38 38 Q 58 24 62 38" opacity="0.45" />
      <path d="M62 38 Q 74 28 86 38" opacity="0.45" />
      <path d="M86 38 Q 102 26 116 38" opacity="0.45" />

      {/* Trabalhador 1 — martelo (esquerda) */}
      <g>
        <circle cx="16" cy="22" r="2.8" />
        <line x1="16" y1="24.5" x2="16" y2="32" />
        <line x1="16" y1="32" x2="12" y2="38" />
        <line x1="16" y1="32" x2="20" y2="38" />
        <line x1="16" y1="28" x2="10" y2="29" />
        <g style={{ transformOrigin: "16px 28px", animation: "hammer 1.1s ease-in-out infinite" }}>
          <line x1="16" y1="28" x2="22" y2="24" />
          <rect x="21" y="21" width="3.5" height="5" rx="0.8" />
        </g>
      </g>

      {/* Trabalhador 2 — carrega tábua (centro-esquerda) */}
      <g>
        <circle cx="40" cy="24" r="2.8" />
        <line x1="40" y1="26.5" x2="40" y2="34" />
        <line x1="40" y1="34" x2="36" y2="38" />
        <line x1="40" y1="34" x2="44" y2="38" />
        {/* Braços a segurar tábua */}
        <line x1="40" y1="29" x2="32" y2="30" />
        <line x1="40" y1="29" x2="48" y2="30" />
        {/* Tábua */}
        <rect x="30" y="28" width="20" height="3" rx="1" opacity="0.7" />
      </g>

      {/* Trabalhador 3 — chave inglesa (centro-direita) */}
      <g>
        <circle cx="64" cy="22" r="2.8" />
        <line x1="64" y1="24.5" x2="64" y2="32" />
        <line x1="64" y1="32" x2="60" y2="38" />
        <line x1="64" y1="32" x2="68" y2="38" />
        <line x1="64" y1="28" x2="70" y2="26" />
        <g style={{ transformOrigin: "64px 28px", animation: "wrench 1.4s ease-in-out infinite 0.3s" }}>
          <line x1="64" y1="28" x2="72" y2="24" />
          <rect x="71" y="21" width="4" height="5" rx="1" />
          <line x1="73" y1="23.5" x2="75" y2="23.5" />
        </g>
      </g>

      {/* Trabalhador 4 — martelo invertido (direita) */}
      <g>
        <circle cx="92" cy="24" r="2.8" />
        <line x1="92" y1="26.5" x2="92" y2="34" />
        <line x1="92" y1="34" x2="88" y2="38" />
        <line x1="92" y1="34" x2="96" y2="38" />
        <line x1="92" y1="30" x2="98" y2="31" />
        <g style={{ transformOrigin: "92px 30px", animation: "hammer 1.2s ease-in-out infinite 0.6s" }}>
          <line x1="92" y1="30" x2="86" y2="26" />
          <rect x="83" y="23" width="3.5" height="5" rx="0.8" />
        </g>
      </g>

      {/* Trabalhador 5 — anda com viga (extrema direita) */}
      <g>
        <circle cx="108" cy="26" r="2.8" />
        <line x1="108" y1="28.5" x2="108" y2="36" />
        <line x1="108" y1="36" x2="104" y2="38" />
        <line x1="108" y1="36" x2="112" y2="38" />
        <line x1="108" y1="32" x2="100" y2="30" />
        <line x1="108" y1="32" x2="116" y2="30" />
        {/* Viga */}
        <rect x="98" y="28" width="20" height="2.5" rx="0.6" opacity="0.7" />
      </g>

      <style>{`
        @keyframes hammer {
          0%, 100% { transform: rotate(-22deg); }
          50% { transform: rotate(28deg); }
        }
        @keyframes wrench {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(20deg); }
        }
      `}</style>
    </svg>
  );
}
