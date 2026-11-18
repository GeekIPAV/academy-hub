import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { linhas } from "@/lib/recursos-ui";
import {
  isPausa,
  parseHorario,
  resumoSessao,
  separarMateriais,
  type PlanoBloco,
  type RecursoRow,
} from "@/lib/plano-sessao";

/**
 * Plano de sessão em A4 (modelo "00_PlanoSessao" redesenhado).
 * Só aparece na impressão: o ecrã continua a mostrar a página do tema.
 * A tabela usa <thead> para o cabeçalho se repetir em cada página.
 */
export interface PlanoImpressaoTema {
  title: string;
  bloco: string | null;
  objectives: string | null;
  pilares: string | null;
  description: string | null;
  processo_u: string | null;
  ter_em_atencao: string | null;
  local: string | null;
  orientacoes: string | null;
}

function Rico({ html }: { html: string | null }) {
  if (!html) return null;
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  return isHtml ? (
    <div className="plano-rico" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} />
  ) : (
    <div className="plano-rico whitespace-pre-line">{html}</div>
  );
}

function Pontos({ items }: { items: string[] }) {
  return (
    <ul className="plano-pontos">
      {items.map((i, k) => (
        <li key={k}>{i}</li>
      ))}
    </ul>
  );
}

export function PlanoSessaoImpressao({
  tema,
  blocos,
  recursos,
}: {
  tema: PlanoImpressaoTema;
  blocos: PlanoBloco[];
  recursos: RecursoRow[];
}) {
  const titulo = tema.bloco ? `${tema.bloco}: ${tema.title}` : tema.title;
  const { inicio } = resumoSessao(blocos);
  const recursoPorId = new Map(recursos.map((r) => [r.id, r]));

  const info: { label: string; content: React.ReactNode }[] = [];
  info.push({ label: "Título / Tema / Seminário", content: <strong className="plano-titulo-tema">{titulo}</strong> });
  info.push({
    label: "Educadores/as Ubuntu",
    content: (
      <div className="plano-linhas-4">
        <span />
        <span />
        <span />
        <span />
      </div>
    ),
  });
  if (tema.objectives) info.push({ label: "Objetivos", content: <Rico html={tema.objectives} /> });
  if (tema.pilares) info.push({ label: "Pilares", content: <Rico html={tema.pilares} /> });
  if (tema.description) info.push({ label: "Enquadramento", content: <Rico html={tema.description} /> });
  if (tema.processo_u) info.push({ label: "Processo U", content: <Rico html={tema.processo_u} /> });
  if (tema.ter_em_atencao) info.push({ label: "Ter em atenção", content: <Rico html={tema.ter_em_atencao} /> });

  return (
    <div className="plano-print" aria-hidden="true">
      <header className="plano-header">
        <div>
          <div className="plano-h1">Plano de sessão</div>
          <div className="plano-acento" />
        </div>
        <div className="plano-marca">
          <span>ACADEMIA DE LÍDERES</span>
          <strong>UBUNTU</strong>
          <em>LEADERS ACADEMY</em>
        </div>
      </header>

      <div className="plano-info">
        {info.map((row) => (
          <div key={row.label} className="plano-info-row">
            <div className="plano-info-label">{row.label}</div>
            <div className="plano-info-valor">{row.content}</div>
          </div>
        ))}
      </div>

      <div className="plano-local">
        <div className="plano-local-head">Local</div>
        <div className="plano-local-head">Data</div>
        <div className="plano-local-head">Início</div>
        <div className="plano-local-head">Orientações e condições</div>
        <div>{tema.local ? <Rico html={tema.local} /> : <span className="plano-pontilhado" />}</div>
        <div>
          <span className="plano-pontilhado" />
        </div>
        <div>
          <strong>{inicio ?? ""}</strong>
        </div>
        <div>{tema.orientacoes ? <Rico html={tema.orientacoes} /> : null}</div>
      </div>

      <table className="plano-tabela">
        <colgroup>
          <col style={{ width: "34%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "33%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Tempo</th>
            <th>Material e recursos</th>
            <th>Responsável · Local · Objetivos</th>
          </tr>
        </thead>
        <tbody>
          <tr className="plano-faixa">
            <td colSpan={4}>{titulo}</td>
          </tr>
          {blocos.map((b) => {
            const h = parseHorario(b.schedule);
            const dur = b.duration_minutes ? `${b.duration_minutes}'` : "";
            if (isPausa(b)) {
              return (
                <tr key={b.id} className="plano-pausa">
                  <td>{b.title || b.tipo}</td>
                  <td>
                    {h.inicio}
                    {h.fim ? `–${h.fim}` : ""}
                  </td>
                  <td>{dur}</td>
                  <td />
                </tr>
              );
            }
            const { equipamento, materiais } = separarMateriais(b.materials);
            const recursosBloco = (b.recurso_ids ?? [])
              .map((id) => recursoPorId.get(id))
              .filter((r): r is RecursoRow => !!r);
            const objetivos = linhas(b.objetivos);
            return (
              <tr key={b.id}>
                <td>
                  {b.tipo && (
                    <div className="plano-tipo">
                      <span />
                      {b.tipo}
                    </div>
                  )}
                  <div className="plano-bloco-titulo">{b.title || "Sem título"}</div>
                  {b.description && (
                    <>
                      <div className="plano-rotulo">Descrição breve</div>
                      <Rico html={b.description} />
                    </>
                  )}
                </td>
                <td>
                  <div className="plano-hora">{h.inicio ?? b.schedule ?? ""}</div>
                  {h.fim && <div className="plano-muted">{h.fim}</div>}
                  {dur && <div className="plano-dur">{dur}</div>}
                </td>
                <td>
                  {equipamento.length > 0 && (
                    <div className="plano-equip">
                      {equipamento.map((e) => (
                        <span key={e}>{e}</span>
                      ))}
                    </div>
                  )}
                  {materiais.map((m, k) => (
                    <div key={k}>{m}</div>
                  ))}
                  {recursosBloco.map((r) => (
                    <div key={r.id} className="plano-recurso">
                      {r.title}
                    </div>
                  ))}
                  {equipamento.length === 0 && materiais.length === 0 && recursosBloco.length === 0 && (
                    <span className="plano-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="plano-campo">
                    <strong>Responsável</strong>
                    <span className="plano-pontilhado" />
                  </div>
                  <div className="plano-campo">
                    <strong>Local</strong>
                    <span className="plano-pontilhado" />
                  </div>
                  {objetivos.length > 0 ? (
                    <>
                      <div className="plano-rotulo">Objetivos</div>
                      <Pontos items={objetivos} />
                    </>
                  ) : (
                    <>
                      <div className="plano-rotulo">Notas</div>
                      <span className="plano-pontilhado" />
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="plano-notas">
        <div className="plano-h2">Notas</div>
        <span className="plano-pontilhado" />
        <span className="plano-pontilhado" />
        <span className="plano-pontilhado" />
      </section>

      <footer className="plano-rodape">
        <span>{titulo}</span>
        <span>
          promovido por <strong>IPAV</strong>
        </span>
      </footer>
    </div>
  );
}
