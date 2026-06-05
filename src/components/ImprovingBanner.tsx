import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * Ponte em arco (ainda em construção) com trabalhadores (capacete + martelo):
 * 2 parados a martelar e 3 a correr de um lado para o outro.
 */
export function ImprovingBanner() {
  const { isComponentVisible } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isComponentVisible(pathname, "improving-banner")) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-[#008DD5]/30 bg-[#E8F4FC] text-[#193B69] shadow-sm">
      <p className="px-6 pt-4 pb-8 text-center text-base font-semibold">Estamos a melhorar esta página</p>
      <ArchBridge className="block w-full h-32" />
    </div>
  );
}

/* ----------------------------- Bridge ----------------------------- */

function ArchBridge({ className }: { className?: string }) {
  const W = 400;
  const H = 100;
  const DECK_EDGE_Y = 70;
  const DECK_PEAK_Y = 42;
  const ARCH_PEAK_Y = 8;
  const ARCH_LEFT = 30;
  const ARCH_RIGHT = 370;

  const deckY = (x: number) => {
    const t = (x - ARCH_LEFT) / (ARCH_RIGHT - ARCH_LEFT);
    const tt = Math.max(0, Math.min(1, t));
    return DECK_EDGE_Y + (DECK_PEAK_Y - DECK_EDGE_Y) * (4 * tt * (1 - tt));
  };

  const archY = (x: number) => {
    const t = (x - ARCH_LEFT) / (ARCH_RIGHT - ARCH_LEFT);
    const tt = Math.max(0, Math.min(1, t));
    return DECK_EDGE_Y + (ARCH_PEAK_Y - DECK_EDGE_Y) * (4 * tt * (1 - tt));
  };

  const deckPath = `M ${ARCH_LEFT} ${DECK_EDGE_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * DECK_PEAK_Y - DECK_EDGE_Y} ${ARCH_RIGHT} ${DECK_EDGE_Y}`;
  const deckPath2 = `M ${ARCH_LEFT} ${DECK_EDGE_Y + 3.5} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * (DECK_PEAK_Y + 3.5) - (DECK_EDGE_Y + 3.5)} ${ARCH_RIGHT} ${DECK_EDGE_Y + 3.5}`;

  const hangerXs: number[] = [];
  for (let x = ARCH_LEFT + 18; x < ARCH_RIGHT; x += 22) hangerXs.push(x);

  const h1x = 130;
  const h2x = 285;

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
      {/* Pilares de apoio */}
      <rect
        x="6"
        y={DECK_EDGE_Y}
        width="18"
        height={H - DECK_EDGE_Y - 2}
        opacity="0.18"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x={W - 24}
        y={DECK_EDGE_Y}
        width="18"
        height={H - DECK_EDGE_Y - 2}
        opacity="0.18"
        fill="currentColor"
        stroke="none"
      />
      <line x1="6" y1={DECK_EDGE_Y} x2="6" y2={H - 2} />
      <line x1="24" y1={DECK_EDGE_Y} x2="24" y2={H - 2} />
      <line x1={W - 24} y1={DECK_EDGE_Y} x2={W - 24} y2={H - 2} />
      <line x1={W - 6} y1={DECK_EDGE_Y} x2={W - 6} y2={H - 2} />

      {/* Água */}
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} opacity="0.25" strokeDasharray="6 4" />
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} opacity="0.18" strokeDasharray="3 5" />

      {/* Arco principal (estrutura superior) — completo */}
      <path
        d={`M ${ARCH_LEFT} ${DECK_EDGE_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * ARCH_PEAK_Y - DECK_EDGE_Y} ${ARCH_RIGHT} ${DECK_EDGE_Y}`}
        strokeWidth="2.2"
      />

      {/* Suspensores completos */}
      {hangerXs.map((x) => {
        const ay = archY(x);
        const dy = deckY(x);
        if (ay >= dy - 2) return null;
        return <line key={`h-${x}`} x1={x} y1={ay} x2={x} y2={dy} opacity="0.55" />;
      })}

      {/* Tabuleiro curvo (linha principal) */}
      <path d={deckPath} strokeWidth="2" />
      <path d={deckPath2} opacity="0.5" />

      {/* Treliça completa por baixo do tabuleiro */}
      {Array.from({ length: 18 }).map((_, i) => {
        const step = (ARCH_RIGHT - ARCH_LEFT) / 18;
        const x1 = ARCH_LEFT + i * step;
        const x2 = x1 + step;
        if (x2 > ARCH_RIGHT) return null;

        const y1 = deckY(x1) + 4;
        const y2 = deckY(x2) + 4;
        const yb1 = y1 + 7;
        const yb2 = y2 + 7;

        return (
          <g key={`tru-${i}`} opacity="0.35">
            <line x1={x1} y1={y1} x2={x2} y2={yb2} />
            <line x1={x2} y1={y2} x2={x1} y2={yb1} />
            <line x1={x1} y1={yb1} x2={x2} y2={yb2} />
          </g>
        );
      })}

      {/* Pilha de materiais no tabuleiro (à esquerda) */}
      <g opacity="0.55">
        <rect x={60} y={deckY(60) - 3} width="10" height="3" fill="currentColor" stroke="none" />
        <rect x={62} y={deckY(62) - 6} width="6" height="3" fill="currentColor" stroke="none" />
      </g>

      {/* 2 trabalhadores parados a martelar */}
      <g transform={`translate(${h1x} ${deckY(h1x)})`}>
        <Hammerer delay={0} />
      </g>
      <g transform={`translate(${h2x} ${deckY(h2x)})`}>
        <Hammerer delay={0.25} flip />
      </g>

      {/* 3 trabalhadores a correr */}
      <g style={{ animation: "run-right 6s linear infinite" }}>
        <Runner deckY={deckY} delay={0} />
      </g>
      <g style={{ animation: "run-left 7s linear infinite", animationDelay: "-1.5s" }}>
        <Runner deckY={deckY} delay={0.2} flip />
      </g>
      <g style={{ animation: "run-right 8s linear infinite", animationDelay: "-3s" }}>
        <Runner deckY={deckY} delay={0.35} />
      </g>

      <style>{`
        @keyframes run-right {
          0%   { transform: translate(35px, 28px); }
          25%  { transform: translate(117px, 7px); }
          50%  { transform: translate(200px, 0px); }
          75%  { transform: translate(282px, 7px); }
          100% { transform: translate(365px, 28px); }
        }
        @keyframes run-left {
          0%   { transform: translate(365px, 28px); }
          25%  { transform: translate(282px, 7px); }
          50%  { transform: translate(200px, 0px); }
          75%  { transform: translate(117px, 7px); }
          100% { transform: translate(35px, 28px); }
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

function Helmet({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <line x1={cx - 3} y1={cy + 0.2} x2={cx + 3} y2={cy + 0.2} strokeWidth="1.4" />
      <path
        d={`M ${cx - 2.6} ${cy + 0.2} A 2.6 2.4 0 0 1 ${cx + 2.6} ${cy + 0.2} Z`}
        fill="currentColor"
        stroke="none"
      />
    </g>
  );
}

/* ----------------------------- Runner ----------------------------- */

function Runner({ deckY, delay, flip = false }: { deckY: (x: number) => number; delay: number; flip?: boolean }) {
  // O runner é desenhado a (0,0); o translateX da animação posiciona-o em x.
  // Para acompanhar a curva, usamos uma translação Y baseada na posição absoluta
  // — aproximamos com um pequeno bob; (acompanhar exatamente a curva exigia JS por frame)
  // Como simplificação, posicionamos o runner numa altura média do deck.
  const baseY = deckY(200); // ponto alto central
  const feetY = baseY;
  const hipY = feetY - 7;
  const shoulderY = hipY - 4;
  const headY = shoulderY - 3;
  const scaleX = flip ? -1 : 1;

  return (
    <g
      transform={`scale(${scaleX} 1)`}
      style={{
        transformOrigin: "0px 0px",
        animation: `bob-runner 0.4s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      <circle cx="0" cy={headY} r="2.2" fill="currentColor" stroke="none" opacity="0.9" />
      <Helmet cx={0} cy={headY - 2.2} />
      <line x1="-0.5" y1={shoulderY} x2="0.8" y2={hipY} />

      <g
        style={{
          transformOrigin: `0.8px ${hipY}px`,
          animation: `leg-front 0.4s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>
      <g
        style={{
          transformOrigin: `0.8px ${hipY}px`,
          animation: `leg-back 0.4s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="0.8" y1={hipY} x2="0.8" y2={feetY} />
      </g>

      <g
        style={{
          transformOrigin: `-0.5px ${shoulderY}px`,
          animation: `arm-back 0.4s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="-0.5" y1={shoulderY} x2="3" y2={shoulderY + 3} />
        <line x1="3" y1={shoulderY + 3} x2="5" y2={shoulderY + 1} strokeWidth="0.8" />
        <rect x="4.4" y={shoulderY + 0.2} width="2" height="1.6" fill="currentColor" stroke="none" />
      </g>
      <g
        style={{
          transformOrigin: `-0.5px ${shoulderY}px`,
          animation: `arm-back 0.4s ease-in-out infinite reverse`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="-0.5" y1={shoulderY} x2="-2.5" y2={shoulderY + 3} />
      </g>
    </g>
  );
}

/* ----------------------------- Hammerer ----------------------------- */

function Hammerer({ delay, flip = false }: { delay: number; flip?: boolean }) {
  const feetY = 0;
  const hipY = feetY - 9;
  const shoulderY = hipY - 5;
  const headY = shoulderY - 3;
  const scaleX = flip ? -1 : 1;

  return (
    <g transform={`scale(${scaleX} 1)`} style={{ transformOrigin: "0px 0px" }}>
      <line x1="-1.5" y1={hipY} x2="-1.5" y2={feetY} />
      <line x1="1.5" y1={hipY} x2="1.5" y2={feetY} />
      <line x1="0" y1={hipY} x2="0" y2={shoulderY} />
      <circle cx="0" cy={headY} r="2.4" fill="currentColor" stroke="none" opacity="0.9" />
      <Helmet cx={0} cy={headY - 2.3} />

      <line x1="0" y1={shoulderY} x2="3" y2={shoulderY + 4} />

      <g
        style={{
          transformOrigin: `0px ${shoulderY}px`,
          animation: `hammer-swing 0.7s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="0" y1={shoulderY} x2="0" y2={shoulderY - 7} strokeWidth="1" />
        <rect x="-2" y={shoulderY - 9} width="4" height="2" fill="currentColor" stroke="none" />
      </g>

      <line x1="3" y1={feetY - 1} x2="5" y2={feetY - 1} opacity="0.5" />
    </g>
  );
}
