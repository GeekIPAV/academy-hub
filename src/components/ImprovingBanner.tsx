import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — aparece no final de cada página.
 * A ponte ocupa todo o bloco, de um lado ao outro, com trabalhadores animados.
 */
export function ImprovingBanner() {
  const { isComponentVisible } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isComponentVisible(pathname, "improving-banner")) {
    return null;
  }

  return (
    <div className="relative mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 text-amber-900 shadow-sm">
      <BridgeWorkersIcon className="block w-full h-28" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="rounded-md bg-amber-50/85 px-4 py-1.5 text-base font-semibold backdrop-blur-sm">
          Estamos a melhorar esta página
        </p>
      </div>
    </div>
  );
}

function BridgeWorkersIcon({ className }: { className?: string }) {
  // viewBox largo para a ponte correr de um lado ao outro
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
      {/* Tabuleiro da ponte (full-width) */}
      <line x1="0" y1="78" x2="400" y2="78" strokeWidth="2" />
      <line x1="0" y1="82" x2="400" y2="82" opacity="0.4" />

      {/* Pilares verticais ao longo da ponte */}
      {[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map((x) => (
        <line key={`p-${x}`} x1={x} y1="82" x2={x} y2="98" />
      ))}

      {/* Arcos da ponte */}
      {[0, 80, 160, 240, 320].map((x) => (
        <path key={`a-${x}`} d={`M${x} 78 Q ${x + 40} 56 ${x + 80} 78`} opacity="0.45" />
      ))}

      {/* Cabos suspensos no topo */}
      <path d="M0 20 Q 200 60 400 20" opacity="0.35" />
      {Array.from({ length: 20 }).map((_, i) => {
        const x = i * 20 + 10;
        // aproximação da curva quadrática y = 20 + (60-20)*4*t*(1-t), t = x/400
        const t = x / 400;
        const y = 20 + (60 - 20) * 4 * t * (1 - t);
        return <line key={`c-${i}`} x1={x} y1={y} x2={x} y2="78" opacity="0.25" />;
      })}

      {/* Torres */}
      <line x1="0" y1="0" x2="0" y2="78" strokeWidth="2" />
      <line x1="400" y1="0" x2="400" y2="78" strokeWidth="2" />

      {/* Trabalhadores espalhados ao longo da ponte */}
      {[
        { x: 30, tool: "hammer", delay: 0 },
        { x: 75, tool: "plank", delay: 0.2 },
        { x: 130, tool: "wrench", delay: 0.4 },
        { x: 175, tool: "hammer", delay: 0.1 },
        { x: 225, tool: "plank", delay: 0.5 },
        { x: 275, tool: "wrench", delay: 0.3 },
        { x: 325, tool: "hammer", delay: 0.6 },
        { x: 370, tool: "plank", delay: 0.2 },
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
      {/* cabeça */}
      <circle cx={x} cy={headY} r="2.4" />
      {/* capacete */}
      <path d={`M${x - 2.8} ${headY - 2} Q ${x} ${headY - 5} ${x + 2.8} ${headY - 2}`} />
      {/* tronco */}
      <line x1={x} y1={bodyTop} x2={x} y2={bodyBottom} />
      {/* pernas */}
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
          {/* braços a segurar a tábua acima da cabeça */}
          <line x1={x} y1={bodyTop + 1} x2={x - 6} y2={headY - 4} />
          <line x1={x} y1={bodyTop + 1} x2={x + 6} y2={headY - 4} />
          <rect x={x - 8} y={headY - 6} width="16" height="2.5" rx="0.6" opacity="0.75" />
        </>
      )}
    </g>
  );
}
