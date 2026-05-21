## Problema

No `src/components/LoadingU.tsx`, o SVG do mandala é injetado com `dangerouslySetInnerHTML` e os atributos visuais (`width`, `height`, `stroke`, `stroke-width`, `fill="none"`, `pathLength`) só são aplicados dentro de um `useEffect`.

Consequências:
- Durante SSR e antes da hidratação, o SVG aparece no tamanho natural do `viewBox` (centenas/milhares de px) e a preto sólido — é o "gigante" que aparece às vezes.
- Em transições de rota rápidas o componente pode montar/desmontar antes do efeito correr, mostrando o SVG cru por um frame.

## Correção

Mover toda a estilização do SVG do `useEffect` para CSS, para que seja aplicada imediatamente no primeiro paint (SSR incluído).

1. Em `src/styles.css`, adicionar regras que afetem o SVG dentro de `.loading-mandela-draw`:
   ```css
   .loading-mandela-draw svg {
     width: 160px;
     height: 200px;
     display: block;
   }
   .loading-mandela-draw svg path {
     fill: none;
     stroke: currentColor;
     stroke-width: 36;
     stroke-linecap: round;
     stroke-linejoin: round;
   }
   ```
   (manter a animação `loading-mandela-draw` que já existe; `pathLength` continua a ser definido onde já está hoje para o stroke-dasharray funcionar — mantemos o `useEffect` apenas para isso ou setamos `pathLength` via atributo no SVG fonte se possível).

2. Em `src/components/LoadingU.tsx`, remover do `useEffect` tudo o que agora vive no CSS. Manter apenas o set de `pathLength="1"` nos `<path>` (necessário em runtime porque é um atributo SVG, não CSS).

3. Para evitar qualquer flash durante o frame em que `pathLength` ainda não foi aplicado, dar um `opacity: 0` inicial ao SVG e passar a `opacity: 1` depois do efeito — ou, alternativa mais simples, aplicar via wrapper `overflow: hidden` + tamanho fixo (160×200) para que mesmo sem estilo o SVG nunca passe desse bounding box.

Resultado: o loader passa a aparecer sempre no tamanho certo, com o traço fino animado, sem nunca mostrar a versão "gigante".

## Ficheiros tocados

- `src/components/LoadingU.tsx` — simplifica o `useEffect`.
- `src/styles.css` — adiciona regras de tamanho e stroke para `.loading-mandela-draw svg`.