import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * Ponte em arco complexa com trabalhadores (capacete + martelo):
 * 2 parados a martelar e 3 a correr de um lado para o outro.
 */
export function ImprovingBanner() {
  const { isComponentVisible } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isComponentVisible(pathname, "improving-banner")) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 text-amber-900 shadow-sm">
      <p className="px-6 pt-4 pb-2 text-base font-semibold">
        Estamos a melhorar esta página
      </p>
      <ArchBridge className="block w-full h-32" />
    </div>
  );
}

/* ----------------------------- Bridge ----------------------------- */

function ArchBridge({ className }: { className?: string }) {
  const W = 400;
  const H = 100;
  const DECK_Y = 55;
  const ARCH_PEAK = 12;
  const ARCH_LEFT = 30;
  const ARCH_RIGHT = 370;

  const archY = (x: number) => {
    const t = (x - ARCH_LEFT) / (ARCH_RIGHT - ARCH_LEFT);
    return ARCH_PEAK + (DECK_Y - ARCH_PEAK) * (1 - 4 * t * (1 - t));
  };

  const hangers: number[] = [];
  for (let x = ARCH_LEFT + 14; x < ARCH_RIGHT; x += 18) hangers.push(x);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Pilares */}
      <rect x="2" y={DECK_Y} width="20" height={H - DECK_Y - 2} opacity="0.18" fill="currentColor" stroke="none" />
      <rect x={W - 22} y={DECK_Y} width="20" height={H - DECK_Y - 2} opacity="0.18" fill="currentColor" stroke="none" />
      <line x1="2" y1={DECK_Y} x2="2" y2={H - 2} />
      <line x1="22" y1={DECK_Y} x2="22" y2={H - 2} />
      <line x1={W - 22} y1={DECK_Y} x2={W - 22} y2={H - 2} />
      <line x1={W - 2} y1={DECK_Y} x2={W - 2} y2={H - 2} />

      {/* Água */}
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} opacity="0.25" strokeDasharray="6 4" />
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} opacity="0.18" strokeDasharray="3 5" />

      {/* Arco principal */}
      <path
        d={`M${ARCH_LEFT} ${DECK_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * ARCH_PEAK - DECK_Y} ${ARCH_RIGHT} ${DECK_Y}`}
        strokeWidth="2.2"
      />
      <path
        d={`M${ARCH_LEFT + 4} ${DECK_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * (ARCH_PEAK + 5) - DECK_Y} ${ARCH_RIGHT - 4} ${DECK_Y}`}
        opacity="0.45"
      />
      {Array.from({ length: 9 }).map((_, i) => {
        const x = ARCH_LEFT + 20 + i * 38;
        return <line key={`tr-${i}`} x1={x} y1={archY(x)} x2={x} y2={archY(x) + 5} opacity="0.4" />;
      })}

      {/* Suspensores */}
      {hangers.map((x) => (
        <line key={`h-${x}`} x1={x} y1={archY(x)} x2={x} y2={DECK_Y} opacity="0.55" />
      ))}

      {/* Tabuleiro */}
      <line x1="0" y1={DECK_Y} x2={W} y2={DECK_Y} strokeWidth="2" />
      <line x1="0" y1={DECK_Y + 3.5} x2={W} y2={DECK_Y + 3.5} opacity="0.5" />
      <line x1="10" y1={DECK_Y + 1.7} x2={W - 10} y2={DECK_Y + 1.7} opacity="0.35" strokeDasharray="6 8" />

      {/* Treliça */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x1 = 22 + i * 18;
        const x2 = x1 + 18;
        if (x2 > W - 22) return null;
        return (
          <g key={`tru-${i}`} opacity="0.35">
            <line x1={x1} y1={DECK_Y + 3.5} x2={x2} y2={DECK_Y + 10} />
            <line x1={x2} y1={DECK_Y + 3.5} x2={x1} y2={DECK_Y + 10} />
            <line x1={x1} y1={DECK_Y + 10} x2={x2} y2={DECK_Y + 10} />
          </g>
        );
      })}

      {/* 2 trabalhadores parados a martelar */}
      <g transform={`translate(110 ${DECK_Y})`}>
        <Hammerer delay={0} />
      </g>
      <g transform={`translate(265 ${DECK_Y})`}>
        <Hammerer delay={0.25} flip />
      </g>

      {/* 3 trabalhadores a correr */}
      <g style={{ animation: "run-right 6s linear infinite" }}>
        <Runner deckY={DECK_Y} delay={0} />
      </g>
      <g style={{ animation: "run-left 7s linear infinite", animationDelay: "-1.5s" }}>
        <Runner deckY={DECK_Y} delay={0.2} flip />
      </g>
      <g style={{ animation: "run-right 8s linear infinite", animationDelay: "-3s" }}>
        <Runner deckY={DECK_Y} delay={0.35} />
      </g>

      <style>{`
        @keyframes run-right {
          from { transform: translateX(-30px); }
          to   { transform: translateX(430px); }
        }
        @keyframes run-left {
          from { transform: translateX(430px); }
          to   { transform: translateX(-30px); }
        }
        @keyframes leg-front {
          0%, 100% { transform: rotate(35deg); }
          50%      { transform: rotate(-35deg); }
        }
        @keyframes leg-back {
          0%, 100% { transform: rotate(-35deg); }
          50%      { transform: rotate(35deg); }
        }
        @keyframes arm-back {
          0%, 100% { transform: rotate(40deg); }
          50%      { transform: rotate(-40deg); }
        }
        @keyframes bob-runner {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
        @keyframes hammer-swing {
          0%, 100% { transform: rotate(-70deg); }
          50%      { transform: rotate(20deg); }
        }
      `}</style>
    </svg>
  );
}

/* ----------------------------- Worker bits ----------------------------- */

// Capacete (forma de meio-disco + aba)
function Helmet({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* aba */}
      <line x1={cx - 3} y1={cy + 0.2} x2={cx + 3} y2={cy + 0.2} strokeWidth="1.4" />
      {/* cúpula */}
      <path d={`M ${cx - 2.6} ${cy + 0.2} A 2.6 2.4 0 0 1 ${cx + 2.6} ${cy + 0.2} Z`} fill="currentColor" stroke="none" />
    </g>
  );
}

/* ----------------------------- Runner ----------------------------- */

function Runner({ deckY, delay, flip = false }: { deckY: number; delay: number; flip?: boolean }) {
  const feetY = deckY;
  const hipY = feetY - 7;
  const shoulderY = hipY - 4;
  const headY = shoulderY - 3;
  const scaleX = flip ? -1 : 1;

  return (
    <g
      transform={`scale(${scaleX} 1)`}
      style={{ transformOrigin: "0px 0px", animation: `bob-runner 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}
    >
      {/* cabeça */}
      <circle cx="0" cy={headY} r="2.2" fill="currentColor" stroke="none" opacity="0.9" />
      {/* capacete */}
      <Helmet cx={0} cy={headY - 2.2} />
      {/* tronco */}
      <line x1="-0.5" y1={shoulderY} x2="0.8" y2={hipY} />

      {/* pernas */}
      <g style={{ transformOrigin: `0.8px ${hipY}px`, animation: `leg-front 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>
      <g style={{ transformOrigin: `0.8px ${hipY}px`, animation: `leg-back 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>

      {/* braço a segurar martelo (à frente) */}
      <g style={{ transformOrigin: `-0.5px ${shoulderY}px`, animation: `arm-back 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="-0.5" y1={shoulderY} x2="3" y2={shoulderY + 3} />
        {/* martelo */}
        <line x1="3" y1={shoulderY + 3} x2="5" y2={shoulderY + 1} strokeWidth="0.8" />
        <rect x="4.4" y={shoulderY + 0.2} width="2" height="1.6" fill="currentColor" stroke="none" />
      </g>
      {/* outro braço */}
      <g style={{ transformOrigin: `-0.5px ${shoulderY}px`, animation: `arm-back 0.4s ease-in-out infinite reverse`, animationDelay: `${delay}s` }}>
        <line x1="-0.5" y1={shoulderY} x2="-2.5" y2={shoulderY + 3} />
      </g>
    </g>
  );
}

/* ----------------------------- Hammerer (parado a martelar) ----------------------------- */

function Hammerer({ delay, flip = false }: { delay: number; flip?: boolean }) {
  // Posicionado com origem nos pés (0,0). Tabuleiro está em y=0 no grupo pai.
  const feetY = 0;
  const hipY = feetY - 9;
  const shoulderY = hipY - 5;
  const headY = shoulderY - 3;
  const scaleX = flip ? -1 : 1;

  return (
    <g transform={`scale(${scaleX} 1)`} style={{ transformOrigin: "0px 0px" }}>
      {/* pernas paradas, ligeiramente afastadas */}
      <line x1="-1.5" y1={hipY} x2="-1.5" y2={feetY} />
      <line x1="1.5" y1={hipY} x2="1.5" y2={feetY} />
      {/* tronco */}
      <line x1="0" y1={hipY} x2="0" y2={shoulderY} />
      {/* cabeça */}
      <circle cx="0" cy={headY} r="2.4" fill="currentColor" stroke="none" opacity="0.9" />
      {/* capacete */}
      <Helmet cx={0} cy={headY - 2.3} />

      {/* braço de apoio (à frente) */}
      <line x1="0" y1={shoulderY} x2="3" y2={shoulderY + 4} />

      {/* braço com martelo a balançar */}
      <g
        style={{
          transformOrigin: `0px ${shoulderY}px`,
          animation: `hammer-swing 0.7s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="0" y1={shoulderY} x2="0" y2={shoulderY - 7} strokeWidth="1" />
        {/* cabeça do martelo */}
        <rect x="-2" y={shoulderY - 9} width="4" height="2" fill="currentColor" stroke="none" />
      </g>

      {/* "prego" / ponto de trabalho */}
      <line x1="3" y1={feetY - 1} x2="5" y2={feetY - 1} opacity="0.5" />
    </g>
  );
}
