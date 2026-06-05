import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * Estilo "Notion" (linhas grossas, cantos arredondados).
 * Ponte em construção com gap central, grua e trabalhadores animados.
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

  // Curvas
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

  const hangerXs: number[] = [];
  for (let x = ARCH_LEFT + 18; x < ARCH_RIGHT; x += 22) hangerXs.push(x);

  const h1x = 110;
  const h2x = 295;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2" // Estilo Notion: linhas mais grossas
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        {/* Máscara para criar o buraco no meio da ponte (construção) */}
        <clipPath id="bridge-gap">
          <rect x="0" y="0" width="170" height={H} />
          <rect x="230" y="0" width={W} height={H} />
        </clipPath>
      </defs>

      {/* Água (linhas onduladas simplificadas) */}
      <path
        d={`M 0 ${H - 8} Q 20 ${H - 12} 40 ${H - 8} T 80 ${H - 8} T 120 ${H - 8} T 160 ${H - 8} T 200 ${H - 8} T 240 ${H - 8} T 280 ${H - 8} T 320 ${H - 8} T 360 ${H - 8} T 400 ${H - 8}`}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d={`M -20 ${H - 3} Q 0 ${H - 7} 20 ${H - 3} T 60 ${H - 3} T 100 ${H - 3} T 140 ${H - 3} T 180 ${H - 3} T 220 ${H - 3} T 260 ${H - 3} T 300 ${H - 3} T 340 ${H - 3} T 380 ${H - 3} T 420 ${H - 3}`}
        strokeWidth="1.5"
        opacity="0.2"
      />

      {/* Pilares de apoio */}
      <rect
        x="10"
        y={DECK_EDGE_Y}
        width="20"
        height={H - DECK_EDGE_Y}
        fill="currentColor"
        opacity="0.1"
        stroke="none"
      />
      <rect x="10" y={DECK_EDGE_Y} width="20" height={H - DECK_EDGE_Y} />
      <rect
        x={W - 30}
        y={DECK_EDGE_Y}
        width="20"
        height={H - DECK_EDGE_Y}
        fill="currentColor"
        opacity="0.1"
        stroke="none"
      />
      <rect x={W - 30} y={DECK_EDGE_Y} width="20" height={H - DECK_EDGE_Y} />

      {/* Grupo com a estrutura principal recortada (gap no centro) */}
      <g clipPath="url(#bridge-gap)">
        {/* Arco e Tabuleiro */}
        <path
          d={`M ${ARCH_LEFT} ${DECK_EDGE_Y} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * ARCH_PEAK_Y - DECK_EDGE_Y} ${ARCH_RIGHT} ${DECK_EDGE_Y}`}
          strokeWidth="2.5"
        />
        <path d={deckPath} strokeWidth="2.5" />
        <path
          d={`M ${ARCH_LEFT} ${DECK_EDGE_Y + 4} Q ${(ARCH_LEFT + ARCH_RIGHT) / 2} ${2 * (DECK_PEAK_Y + 4) - (DECK_EDGE_Y + 4)} ${ARCH_RIGHT} ${DECK_EDGE_Y + 4}`}
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Suspensores */}
        {hangerXs.map((x) => {
          const ay = archY(x);
          const dy = deckY(x);
          if (ay >= dy - 2) return null;
          return <line key={`h-${x}`} x1={x} y1={ay} x2={x} y2={dy} strokeWidth="1.5" />;
        })}

        {/* Treliça inferior */}
        {Array.from({ length: 18 }).map((_, i) => {
          const step = (ARCH_RIGHT - ARCH_LEFT) / 18;
          const x1 = ARCH_LEFT + i * step;
          const x2 = x1 + step;
          if (x2 > ARCH_RIGHT) return null;
          const y1 = deckY(x1) + 4;
          const y2 = deckY(x2) + 4;
          return (
            <g key={`tru-${i}`} strokeWidth="1.2" opacity="0.5">
              <line x1={x1} y1={y1} x2={x2} y2={y2 + 8} />
              <line x1={x2} y1={y2} x2={x1} y2={y1 + 8} />
            </g>
          );
        })}
      </g>

      {/* Andaimes de suporte ao lado do buraco */}
      <g strokeWidth="1.5" opacity="0.7">
        {/* Andaime Esquerdo */}
        <line x1="160" y1={deckY(160)} x2="160" y2={H - 5} />
        <line x1="145" y1={deckY(145)} x2="145" y2={H - 5} />
        <line x1="140" y1="65" x2="165" y2="65" />
        <line x1="140" y1="80" x2="165" y2="80" />
        <line x1="145" y1="65" x2="160" y2="80" strokeWidth="1" />
        <line x1="160" y1="65" x2="145" y2="80" strokeWidth="1" />

        {/* Andaime Direito */}
        <line x1="240" y1={deckY(240)} x2="240" y2={H - 5} />
        <line x1="255" y1={deckY(255)} x2="255" y2={H - 5} />
        <line x1="235" y1="65" x2="260" y2="65" />
        <line x1="235" y1="80" x2="260" y2="80" />
        <line x1="240" y1="65" x2="255" y2="80" strokeWidth="1" />
        <line x1="255" y1="65" x2="240" y2="80" strokeWidth="1" />
      </g>

      {/* Grua a colocar o pedaço central */}
      <g strokeWidth="2">
        <line x1="215" y1="5" x2="215" y2="65" /> {/* Mastro */}
        <line x1="170" y1="15" x2="235" y2="15" /> {/* Braço */}
        <line x1="215" y1="30" x2="190" y2="15" strokeWidth="1.5" /> {/* Reforço diagonal */}
        <line x1="195" y1="15" x2="195" y2="35" strokeWidth="1" strokeDasharray="2 1" /> {/* Cabo */}
        {/* Peça a ser colocada - quase alinhada com o tabuleiro para os runners passarem */}
        <path d={`M 170 ${deckY(170) - 2} Q 200 ${deckY(200) - 2} 230 ${deckY(230) - 2}`} strokeWidth="2.5" />
        <path
          d={`M 170 ${deckY(170) + 2} Q 200 ${deckY(200) + 2} 230 ${deckY(230) + 2}`}
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>

      {/* Materiais na ponte */}
      <rect x="65" y={deckY(65) - 6} width="12" height="6" fill="currentColor" stroke="none" opacity="0.8" />
      <rect x="68" y={deckY(68) - 12} width="8" height="6" fill="currentColor" stroke="none" opacity="0.8" />

      {/* 2 Trabalhadores parados a martelar */}
      <g transform={`translate(${h1x} ${deckY(h1x)})`}>
        <Hammerer delay={0} />
      </g>
      <g transform={`translate(${h2x} ${deckY(h2x)})`}>
        <Hammerer delay={0.25} flip />
      </g>

      {/* 3 Trabalhadores a correr */}
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
      <line x1={cx - 3.5} y1={cy + 0.5} x2={cx + 3.5} y2={cy + 0.5} strokeWidth="1.5" />
      <path d={`M ${cx - 3} ${cy + 0.5} A 3 2.8 0 0 1 ${cx + 3} ${cy + 0.5} Z`} fill="currentColor" stroke="none" />
    </g>
  );
}

/* ----------------------------- Runner ----------------------------- */

function Runner({ deckY, delay, flip = false }: { deckY: (x: number) => number; delay: number; flip?: boolean }) {
  const baseY = deckY(200);
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
      strokeWidth="1.8" // Corpo mais preenchido
    >
      <circle cx="0" cy={headY} r="2.5" fill="none" stroke="currentColor" />
      <Helmet cx={0} cy={headY - 2.5} />
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
        <line x1="3" y1={shoulderY + 3} x2="5" y2={shoulderY + 1} strokeWidth="1.2" />
        <rect x="4.4" y={shoulderY + 0.2} width="2.5" height="2" fill="currentColor" stroke="none" />
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
    <g transform={`scale(${scaleX} 1)`} style={{ transformOrigin: "0px 0px" }} strokeWidth="1.8">
      <line x1="-1.5" y1={hipY} x2="-1.5" y2={feetY} />
      <line x1="1.5" y1={hipY} x2="1.5" y2={feetY} />
      <line x1="0" y1={hipY} x2="0" y2={shoulderY} />
      <circle cx="0" cy={headY} r="2.5" fill="none" stroke="currentColor" />
      <Helmet cx={0} cy={headY - 2.5} />

      <line x1="0" y1={shoulderY} x2="3" y2={shoulderY + 4} />

      <g
        style={{
          transformOrigin: `0px ${shoulderY}px`,
          animation: `hammer-swing 0.7s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <line x1="0" y1={shoulderY} x2="0" y2={shoulderY - 7} strokeWidth="1.2" />
        <rect x="-2.5" y={shoulderY - 9.5} width="5" height="2.5" fill="currentColor" stroke="none" />
      </g>

      <line x1="3" y1={feetY - 1} x2="5" y2={feetY - 1} strokeWidth="1" opacity="0.5" />
    </g>
  );
}
