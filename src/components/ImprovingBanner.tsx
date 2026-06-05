import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";

/**
 * Banner "Estamos a melhorar esta página" — estilo Notion em construção.
 */
export function ImprovingBanner() {
  const { isComponentVisible } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isComponentVisible(pathname, "improving-banner")) {
    return null;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-[#008DD5]/20 bg-[#E8F4FC] text-[#193B69] shadow-sm">
      <p className="px-6 pt-6 pb-8 text-center text-base font-semibold tracking-wide">Estamos a melhorar esta página</p>
      <ConstructionBridge className="block w-full h-auto max-h-40" />
    </div>
  );
}

/* ----------------------------- Desenho da Ponte ----------------------------- */

function ConstructionBridge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 180"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Estilos das Animações */}
      <style>{`
        .anim-hammer {
          transform-origin: 2px -10px;
          animation: hammer-swing 0.6s ease-in-out infinite alternate;
        }
        .anim-hammer-delayed {
          transform-origin: 2px -10px;
          animation: hammer-swing 0.6s ease-in-out infinite alternate;
          animation-delay: 0.3s;
        }
        .anim-runner-1 {
          animation: run-left-right 6s linear infinite;
        }
        .anim-runner-2 {
          animation: run-right-left 5s linear infinite;
        }
        .anim-crane-load {
          animation: float-load 3s ease-in-out infinite alternate;
        }
        .anim-water {
          animation: wave-move 4s linear infinite;
        }
        .leg-l {
          transform-origin: 0px -4px;
          animation: stride 0.4s ease-in-out infinite alternate;
        }
        .leg-r {
          transform-origin: 0px -4px;
          animation: stride 0.4s ease-in-out infinite alternate reverse;
        }

        @keyframes hammer-swing {
          0% { transform: rotate(-60deg); }
          100% { transform: rotate(15deg); }
        }
        @keyframes stride {
          0% { transform: rotate(-25deg); }
          100% { transform: rotate(25deg); }
        }
        @keyframes float-load {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-5px); }
        }
        @keyframes run-left-right {
          0% { transform: translate(320px, 108px); }
          100% { transform: translate(450px, 122px); }
        }
        @keyframes run-right-left {
          0% { transform: translate(440px, 122px) scaleX(-1); }
          100% { transform: translate(310px, 106px) scaleX(-1); }
        }
        @keyframes wave-move {
          0% { strokeDashoffset: 0; }
          100% { strokeDashoffset: -40; }
        }
      `}</style>

      {/* Encostas / Pilares Laterais */}
      <path d="M 0 140 L 40 140 L 40 170 L 0 170 Z" fill="currentColor" opacity="0.1" />
      <line x1="40" y1="140" x2="40" y2="170" />
      <path d="M 560 142 L 600 142 L 600 170 L 560 170 Z" fill="currentColor" opacity="0.1" />
      <line x1="560" y1="142" x2="560" y2="170" />

      {/* Andaimes (Esquerda e Centro) */}
      <g opacity="0.3" strokeWidth="1.5">
        {/* Andaime Esquerda */}
        <line x1="90" y1="120" x2="90" y2="165" />
        <line x1="120" y1="112" x2="120" y2="165" />
        <line x1="90" y1="135" x2="120" y2="135" />
        <line x1="90" y1="150" x2="120" y2="150" />
        <line x1="90" y1="135" x2="120" y2="150" />
        <line x1="120" y1="135" x2="90" y2="150" />

        {/* Andaime Centro (Suporte do corte) */}
        <line x1="240" y1="95" x2="240" y2="165" />
        <line x1="260" y1="95" x2="260" y2="165" />
        <line x1="240" y1="115" x2="260" y2="115" />
        <line x1="240" y1="135" x2="260" y2="135" />
        <line x1="240" y1="155" x2="260" y2="155" />
        <line x1="240" y1="115" x2="260" y2="135" />
        <line x1="260" y1="115" x2="240" y2="135" />
      </g>

      {/* PONTE ESQUERDA (Em construção) */}
      <g>
        <path d="M 40 140 C 100 110, 180 95, 260 95" strokeWidth="3" />
        <path d="M 40 148 C 100 118, 180 103, 260 103" strokeWidth="1.5" opacity="0.5" />
        {/* Treliça interna */}
        <path d="M 45 140 L 65 118 L 95 130 L 125 106 L 165 120 L 205 97 L 245 108" opacity="0.4" strokeWidth="1.5" />
        {/* Arco superior esquerdo */}
        <path d="M 40 140 C 90 90, 170 65, 260 65" strokeWidth="3" />
        {/* Linhas verticais de união */}
        <line x1="90" y1="114" x2="90" y2="82" opacity="0.4" />
        <line x1="140" y1="104" x2="140" y2="72" opacity="0.4" />
        <line x1="190" y1="98" x2="190" y2="66" opacity="0.4" />
        <line x1="240" y1="95" x2="240" y2="65" opacity="0.4" />
        {/* Fim do corte abrupto da estrutura */}
        <line x1="260" y1="65" x2="260" y2="95" strokeDasharray="3 3" />
      </g>

      {/* PONTE DIREITA (Em construção) */}
      <g>
        <path d="M 310 105 C 390 105, 480 115, 560 142" strokeWidth="3" />
        <path d="M 310 113 C 390 113, 480 123, 560 150" strokeWidth="1.5" opacity="0.5" />
        {/* Treliça interna */}
        <path d="M 320 113 L 350 105 L 390 118 L 430 109 L 480 125 L 530 116" opacity="0.4" strokeWidth="1.5" />
        {/* Arco superior direito */}
        <path d="M 310 68 C 390 68, 480 90, 560 142" strokeWidth="3" />
        {/* Linhas verticais */}
        <line x1="350" y1="105" x2="350" y2="70" opacity="0.4" />
        <line x1="410" y1="106" x2="410" y2="75" opacity="0.4" />
        <line x1="470" y1="112" x2="470" y2="88" opacity="0.4" />
        {/* Fim do corte abrupto */}
        <line x1="310" y1="68" x2="310" y2="105" strokeDasharray="3 3" />
      </g>

      {/* O GUINDASTE (Estilo minimalista do Notion) */}
      <g strokeWidth="2.5">
        {/* Base / Torre */}
        <path d="M 360 140 L 360 25 L 372 25 L 372 140" fill="currentColor" opacity="0.05" />
        <line x1="360" y1="25" x2="372" y2="25" />
        <line x1="360" y1="140" x2="360" y2="25" />
        <line x1="372" y1="140" x2="372" y2="25" />
        <path
          d="M 360 120 L 372 100 M 360 100 L 372 80 M 360 80 L 372 60 M 360 60 L 372 40"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Lança do Guindaste */}
        <line x1="300" y1="25" x2="440" y2="25" />
        <line x1="366" y1="25" x2="366" y2="12" />
        <line x1="300" y1="25" x2="366" y2="12" strokeWidth="1.5" />
        <line x1="400" y1="25" x2="366" y2="12" strokeWidth="1.5" />

        {/* Cabo e Carga Suspensa Animada */}
        <g className="anim-crane-load">
          <line x1="325" y1="25" x2="325" y2="60" strokeWidth="1.5" />
          <circle cx="325" cy="62" r="2" fill="currentColor" />
          {/* Peça de ponte a ser encaixada */}
          <path d="M 295 68 L 355 68" strokeWidth="4" />
          <path d="M 300 68 L 315 76 L 335 68 L 350 76" strokeWidth="1.5" opacity="0.6" />
        </g>
      </g>

      {/* Tijolos / Materiais empilhados */}
      <g opacity="0.7" strokeWidth="1.5">
        <rect x="105" y="103" width="12" height="6" rx="1" fill="currentColor" />
        <rect x="118" y="101" width="12" height="6" rx="1" fill="currentColor" />
        <rect x="110" y="95" width="12" height="6" rx="1" fill="currentColor" />
      </g>

      {/* TRABALHADORES ANIMADOS */}

      {/* Trabalhador 1: Esquerda, a martelar */}
      <g transform="translate(150, 102)">
        <circle cx="0" cy="-14" r="3.5" fill="currentColor" />
        <path d="M -4.5 -15.5 A 4.5 4 0 0 1 4.5 -15.5 Z" fill="currentColor" /> {/* Capacete */}
        <line x1="0" y1="-11" x2="0" y2="-3" strokeWidth="2.5" /> {/* Corpo */}
        <line x1="0" y1="-3" x2="-4" y2="5" strokeWidth="2.5" /> {/* Pernas */}
        <line x1="0" y1="-3" x2="4" y2="5" strokeWidth="2.5" />
        {/* Braço com Martelo Animado */}
        <g className="anim-hammer">
          <line x1="0" y1="-9" x2="6" y2="-11" strokeWidth="2" />
          <path d="M 5 -15 L 9 -13 L 8 -11 L 4 -13 Z" fill="currentColor" /> {/* Martelo */}
        </g>
      </g>

      {/* Trabalhador 2: Centro-Esquerda, a martelar invertido */}
      <g transform="translate(210, 96)">
        <circle cx="0" cy="-14" r="3.5" fill="currentColor" />
        <path d="M -4.5 -15.5 A 4.5 4 0 0 1 4.5 -15.5 Z" fill="currentColor" />
        <line x1="0" y1="-11" x2="0" y2="-3" strokeWidth="2.5" />
        <line x1="0" y1="-3" x2="-3" y2="5" strokeWidth="2.5" />
        <line x1="0" y1="-3" x2="3" y2="5" strokeWidth="2.5" />
        <g className="anim-hammer-delayed">
          <line x1="0" y1="-9" x2="-6" y2="-11" strokeWidth="2" />
          <path d="M -5 -15 L -9 -13 L -8 -11 L -4 -13 Z" fill="currentColor" />
        </g>
      </g>

      {/* Trabalhador 3: Direita, a correr (Looping) */}
      <g className="anim-runner-1">
        <circle cx="0" cy="-14" r="3.5" fill="currentColor" />
        <path d="M -4.5 -15.5 A 4.5 4 0 0 1 4.5 -15.5 Z" fill="currentColor" />
        <line x1="0" y1="-11" x2="1" y2="-4" strokeWidth="2.5" />
        {/* Pernas em passada */}
        <line x1="1" y1="-4" x2="-3" y2="4" className="leg-l" strokeWidth="2.5" />
        <line x1="1" y1="-4" x2="5" y2="4" className="leg-r" strokeWidth="2.5" />
        {/* Braços correndo */}
        <line x1="1" y1="-9" x2="-4" y2="-5" strokeWidth="2" />
        <line x1="1" y1="-9" x2="5" y2="-6" strokeWidth="2" />
      </g>

      {/* Trabalhador 4: Direita, a correr noutra direção (Looping) */}
      <g className="anim-runner-2">
        <circle cx="0" cy="-14" r="3.5" fill="currentColor" />
        <path d="M -4.5 -15.5 A 4.5 4 0 0 1 4.5 -15.5 Z" fill="currentColor" />
        <line x1="0" y1="-11" x2="1" y2="-4" strokeWidth="2.5" />
        <line x1="1" y1="-4" x2="-4" y2="4" className="leg-l" strokeWidth="2.5" />
        <line x1="1" y1="-4" x2="4" y2="4" className="leg-r" strokeWidth="2.5" />
        <line x1="1" y1="-9" x2="-3" y2="-4" strokeWidth="2" />
        {/* Segurando um plano/papel técnico */}
        <path d="M 2 -8 L 7 -12 L 10 -7 L 5 -3 Z" fill="currentColor" opacity="0.2" />
        <line x1="1" y1="-9" x2="6" y2="-7" strokeWidth="2" />
      </g>

      {/* Água em movimento constante */}
      <g className="anim-water" strokeDasharray="20 15">
        <path
          d="M -40 166 Q -20 163, 0 166 T 40 166 T 80 166 T 120 166 T 160 166 T 200 166 T 240 166 T 280 166 T 320 166 T 360 166 T 400 166 T 440 166 T 480 166 T 520 166 T 560 166 T 600 166 T 640 166"
          opacity="0.4"
        />
        <path
          d="M -20 171 Q 0 169, 20 171 T 60 171 T 100 171 T 140 171 T 180 171 T 220 171 T 260 171 T 300 171 T 340 171 T 380 171 T 420 171 T 460 171 T 500 171 T 540 171 T 580 171 T 620 171"
          opacity="0.2"
        />
      </g>
    </svg>
  );
}
