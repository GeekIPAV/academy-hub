import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * Ponte em arco complexa, com tabuleiro centrado, suspensa por cabos a partir
 * do arco. Bonecos a correr de um lado para o outro sobre o tabuleiro.
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
  // Geometria do arco principal (suspende o tabuleiro)
  // Tabuleiro está em y = DECK_Y, centrado verticalmente no bloco
  const W = 400;
  const H = 100;
  const DECK_Y = 55; // tabuleiro centrado
  const ARCH_PEAK = 12;
  const ARCH_LEFT = 30;
  const ARCH_RIGHT = 370;

  // y do arco numa coordenada x (parábola)
  const archY = (x: number) => {
    const t = (x - ARCH_LEFT) / (ARCH_RIGHT - ARCH_LEFT);
    return ARCH_PEAK + (DECK_Y - ARCH_PEAK) * (1 - 4 * t * (1 - t));
  };

  // Suspensores verticais do arco até ao tabuleiro
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
      {/* Pilares de apoio (encontros) */}
      <rect x="2" y={DECK_Y} width="20" height={H - DECK_Y - 2} opacity="0.18" fill="currentColor" stroke="none" />
      <rect x={W - 22} y={DECK_Y} width="20" height={H - DECK_Y - 2} opacity="0.18" fill="currentColor" stroke="none" />
      <line x1="2" y1={DECK_Y} x2="2" y2={H - 2} />
      <line x1="22" y1={DECK_Y} x2="22" y2={H - 2} />
      <line x1={W - 22} y1={DECK_Y} x2={W - 22} y2={H - 2} />
      <line x1={W - 2} y1={DECK_Y} x2={W - 2} y2={H - 2} />

      {/* Água/sombra por baixo */}
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} opacity="0.25" strokeDasharray="6 4" />
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} opacity="0.18" strokeDasharray="3 5" />

      {/* Arco principal (duplo, para volume) */}
      <path
        d={`M${ARCH_LEFT} ${DECK_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * ARCH_PEAK - DECK_Y} ${ARCH_RIGHT} ${DECK_Y}`}
        strokeWidth="2.2"
      />
      <path
        d={`M${ARCH_LEFT + 4} ${DECK_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * (ARCH_PEAK + 5) - DECK_Y} ${ARCH_RIGHT - 4} ${DECK_Y}`}
        opacity="0.45"
      />
      {/* Travessas que ligam os dois arcos */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = ARCH_LEFT + 20 + i * 38;
        return <line key={`tr-${i}`} x1={x} y1={archY(x)} x2={x} y2={archY(x) + 5} opacity="0.4" />;
      })}

      {/* Suspensores verticais (do arco até ao tabuleiro) */}
      {hangers.map((x) => (
        <line key={`h-${x}`} x1={x} y1={archY(x)} x2={x} y2={DECK_Y} opacity="0.55" />
      ))}

      {/* Tabuleiro (centrado) */}
      <line x1="0" y1={DECK_Y} x2={W} y2={DECK_Y} strokeWidth="2" />
      <line x1="0" y1={DECK_Y + 3.5} x2={W} y2={DECK_Y + 3.5} opacity="0.5" />
      {/* Traços do tabuleiro (linha central da estrada) */}
      <line x1="10" y1={DECK_Y + 1.7} x2={W - 10} y2={DECK_Y + 1.7} opacity="0.35" strokeDasharray="6 8" />

      {/* Treliça por baixo do tabuleiro */}
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

      {/* Bonecos a correr — animados ao longo do tabuleiro */}
      <g style={{ animation: "run-right 6s linear infinite" }}>
        <Runner deckY={DECK_Y} delay={0} />
      </g>
      <g style={{ animation: "run-right 6s linear infinite", animationDelay: "-2s" }}>
        <Runner deckY={DECK_Y} delay={0.15} />
      </g>
      <g style={{ animation: "run-left 7s linear infinite", animationDelay: "-1s" }}>
        <Runner deckY={DECK_Y} delay={0.3} flip />
      </g>
      <g style={{ animation: "run-left 7s linear infinite", animationDelay: "-4s" }}>
        <Runner deckY={DECK_Y} delay={0.45} flip />
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
        @keyframes arm-front {
          0%, 100% { transform: rotate(-40deg); }
          50%      { transform: rotate(40deg); }
        }
        @keyframes arm-back {
          0%, 100% { transform: rotate(40deg); }
          50%      { transform: rotate(-40deg); }
        }
        @keyframes bob-runner {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
      `}</style>
    </svg>
  );
}

/* ----------------------------- Runner ----------------------------- */

function Runner({ deckY, delay, flip = false }: { deckY: number; delay: number; flip?: boolean }) {
  // Boneco posicionado em x=0 (translação aplicada pelo grupo pai).
  // Pés ficam sobre o tabuleiro (deckY). Altura ~ 14px.
  const feetY = deckY; // pés sobre tabuleiro
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
      <circle cx="0" cy={headY} r="2.2" />
      {/* tronco inclinado para a frente */}
      <line x1="-0.5" y1={shoulderY} x2="0.8" y2={hipY} />

      {/* pernas (a alternar) */}
      <g style={{ transformOrigin: `0.8px ${hipY}px`, animation: `leg-front 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>
      <g style={{ transformOrigin: `0.8px ${hipY}px`, animation: `leg-back 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>

      {/* braços (a alternar, opostos às pernas) */}
      <g style={{ transformOrigin: `-0.5px ${shoulderY}px`, animation: `arm-front 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="-0.5" y1={shoulderY} x2="-0.5" y2={shoulderY + 5} />
      </g>
      <g style={{ transformOrigin: `-0.5px ${shoulderY}px`, animation: `arm-back 0.4s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <line x1="-0.5" y1={shoulderY} x2="-0.5" y2={shoulderY + 5} />
      </g>
    </g>
  );
}
