import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * Mostra uma ponte EM CONSTRUÇÃO (não terminada) a ocupar o bloco todo,
 * com o texto por cima da imagem.
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
      <BridgeUnderConstruction className="block w-full h-28" />
    </div>
  );
}

function BridgeUnderConstruction({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Lado esquerdo da ponte — já construído */}
      <line x1="0" y1="78" x2="170" y2="78" strokeWidth="2" />
      <line x1="0" y1="82" x2="170" y2="82" opacity="0.4" />
      {[20, 60, 100, 140].map((x) => (
        <line key={`pl-${x}`} x1={x} y1="82" x2={x} y2="98" />
      ))}
      {[0, 80].map((x) => (
        <path key={`al-${x}`} d={`M${x} 78 Q ${x + 40} 56 ${x + 80} 78`} opacity="0.45" />
      ))}

      {/* Lado direito da ponte — já construído */}
      <line x1="260" y1="78" x2="400" y2="78" strokeWidth="2" />
      <line x1="260" y1="82" x2="400" y2="82" opacity="0.4" />
      {[280, 320, 360, 395].map((x) => (
        <line key={`pr-${x}`} x1={x} y1="82" x2={x} y2="98" />
      ))}
      <path d="M260 78 Q 300 56 340 78" opacity="0.45" />
      <path d="M340 78 Q 370 58 400 78" opacity="0.45" />

      {/* Vão central INACABADO — vigas soltas, gap entre 170 e 260 */}
      {/* viga em construção pendurada */}
      <line x1="170" y1="78" x2="200" y2="74" opacity="0.7" />
      <line x1="230" y1="76" x2="260" y2="78" opacity="0.7" />
      {/* peças soltas / por colocar */}
      <rect x="200" y="72" width="14" height="2.5" rx="0.5" opacity="0.55" transform="rotate(-6 207 73)" />
      <rect x="218" y="74" width="12" height="2.5" rx="0.5" opacity="0.55" transform="rotate(4 224 75)" />
      {/* andaime no meio */}
      <line x1="200" y1="78" x2="200" y2="98" opacity="0.5" />
      <line x1="230" y1="78" x2="230" y2="98" opacity="0.5" />
      <line x1="200" y1="88" x2="230" y2="88" opacity="0.5" />
      <line x1="200" y1="78" x2="230" y2="78" opacity="0.5" strokeDasharray="3 3" />

      {/* Torres */}
      <line x1="0" y1="10" x2="0" y2="78" strokeWidth="2" />
      <line x1="400" y1="10" x2="400" y2="78" strokeWidth="2" />

      {/* Cabos suspensos — parcialmente colocados */}
      <path d="M0 18 Q 140 60 170 50" opacity="0.35" />
      <path d="M260 50 Q 300 58 400 18" opacity="0.35" />
      {/* cabo central por ligar (tracejado) */}
      <path d="M170 50 Q 215 38 260 50" opacity="0.3" strokeDasharray="3 3" />

      {/* Trabalhadores espalhados, concentrados na zona em construção */}
      {[
        { x: 35, tool: "hammer", delay: 0 },
        { x: 90, tool: "plank", delay: 0.2 },
        { x: 145, tool: "wrench", delay: 0.4 },
        { x: 185, tool: "hammer", delay: 0.1 },
        { x: 215, tool: "plank", delay: 0.5 },
        { x: 245, tool: "wrench", delay: 0.3 },
        { x: 295, tool: "hammer", delay: 0.6 },
        { x: 360, tool: "plank", delay: 0.2 },
      ].map((w, i) => (
        <Worker key={i} x={w.x} tool={w.tool as "hammer" | "wrench" | "plank"} delay={w.delay} />
      ))}

      <style>{`
        @keyframes hammer {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(30deg); }
        }
        @keyframes wrench {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.2px); }
        }
      `}</style>
    </svg>
  );
}

function Worker({ x, tool, delay }: { x: number; tool: "hammer" | "wrench" | "plank"; delay: number }) {
  const headY = 58;
  const bodyTop = headY + 2.5;
  const bodyBottom = headY + 12;
  return (
    <g style={{ animation: `bob 1.4s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: `${x}px ${headY}px` }}>
      <circle cx={x} cy={headY} r="2.4" />
      <path d={`M${x - 2.8} ${headY - 2} Q ${x} ${headY - 5} ${x + 2.8} ${headY - 2}`} />
      <line x1={x} y1={bodyTop} x2={x} y2={bodyBottom} />
      <line x1={x} y1={bodyBottom} x2={x - 2.5} y2={bodyBottom + 6} />
      <line x1={x} y1={bodyBottom} x2={x + 2.5} y2={bodyBottom + 6} />

      {tool === "hammer" && (
        <>
          <line x1={x} y1={headY + 6} x2={x - 4} y2={headY + 7} />
          <g style={{ transformOrigin: `${x}px ${headY + 6}px`, animation: `hammer 1s ease-in-out infinite`, animationDelay: `${delay}s` }}>
            <line x1={x} y1={headY + 6} x2={x + 5} y2={headY + 2} />
            <rect x={x + 4.2} y={headY - 1} width="3" height="4" rx="0.6" />
          </g>
        </>
      )}

      {tool === "wrench" && (
        <>
          <line x1={x} y1={headY + 6} x2={x - 4} y2={headY + 5} />
          <g style={{ transformOrigin: `${x}px ${headY + 6}px`, animation: `wrench 1.3s ease-in-out infinite`, animationDelay: `${delay}s` }}>
            <line x1={x} y1={headY + 6} x2={x + 6} y2={headY + 3} />
            <rect x={x + 5.5} y={headY} width="3" height="4" rx="0.8" />
            <line x1={x + 7} y1={headY + 1.5} x2={x + 8.5} y2={headY + 1.5} />
          </g>
        </>
      )}

      {tool === "plank" && (
        <>
          <line x1={x} y1={bodyTop + 1} x2={x - 6} y2={headY - 4} />
          <line x1={x} y1={bodyTop + 1} x2={x + 6} y2={headY - 4} />
          <rect x={x - 8} y={headY - 6} width="16" height="2.5" rx="0.6" opacity="0.75" />
        </>
      )}
    </g>
  );
}
