import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, fieldA11y, fieldErrorClass } from "@/components/shell/FormField";
import { StatusChip } from "@/components/shell/StatusChip";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMeuPerfilCertificacao,
  saveMeuPerfilCertificacao,
  type CertificacaoData,
} from "@/lib/certificacao-perfil.functions";
import {
  COUNTRY_OPTIONS,
  PORTUGUESE_MUNICIPALITIES,
  isOlderThanTwoYears,
  isValidNif,
  isValidPhone,
} from "@/lib/certificacao-options";

const GENERO = ["Feminino", "Masculino"];
const DOC_TIPO = ["Cartão de Cidadão", "Bilhete de Identidade", "Passaporte", "Título de Residência"];
const HABILITACOES = [
  "Ensino Básico (1.º Ciclo)",
  "Ensino Básico (2.º Ciclo)",
  "Ensino Básico (3.º Ciclo)",
  "Ensino Secundário",
  "Bacharelato",
  "Licenciatura",
  "Pós-Graduação",
  "Mestrado",
  "Doutoramento",
];

type Profile = Awaited<ReturnType<typeof getMeuPerfilCertificacao>>;

interface Props {
  onSaved: () => void;
  onCancel?: () => void;
  /** Mostra um índice lateral com o estado de cada bloco (para a página própria). */
  comIndice?: boolean;
}

const NOMES_BLOCOS = ["Dados pessoais", "Morada", "Contactos", "Formação e profissão"];

export function CertificacaoForm({ onSaved, onCancel, comIndice }: Props) {
  const fetchFn = useServerFn(getMeuPerfilCertificacao);
  const saveFn = useServerFn(saveMeuPerfilCertificacao);
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["meu-perfil-certificacao"],
    queryFn: () => fetchFn(),
  });

  const [form, setForm] = useState<CertificacaoData>({
    first_names: "",
    last_names: "",
    gender: "",
    birth_date: "",
    nif: "",
    id_doc_type: "",
    id_doc_number: "",
    id_doc_expiry: "",
    nationality_country: "Portugal",
    origin_country: "Portugal",
    birth_concelho: "",
    residence_concelho: "",
    address: "",
    address_cp4: "",
    address_cp3: "",
    locality: "",
    education_level: "",
    job_title: "",
    work_institution: "",
    phone: "",
    cedula_profissional: "",
    grupo_recrutamento: "",
    data_consent: false,
  });

  useEffect(() => {
    if (!profile) return;
    const fn = (profile.full_name ?? "").trim();
    const [first = "", ...rest] = fn.split(" ");
    setForm((s) => ({
      ...s,
      first_names: profile.first_names ?? first ?? "",
      last_names: profile.last_names ?? rest.join(" ") ?? "",
      gender: profile.gender ?? "",
      birth_date: profile.birth_date ?? "",
      nif: profile.nif ?? "",
      id_doc_type: profile.id_doc_type ?? "",
      id_doc_number: profile.id_doc_number ?? "",
      id_doc_expiry: profile.id_doc_expiry ?? "",
      nationality_country: profile.nationality_country ?? "Portugal",
      origin_country: profile.origin_country ?? "Portugal",
      birth_concelho: profile.birth_concelho ?? "",
      residence_concelho: profile.residence_concelho ?? "",
      address: profile.address ?? "",
      address_cp4: profile.address_cp4 ?? "",
      address_cp3: profile.address_cp3 ?? "",
      locality: profile.locality ?? "",
      education_level: profile.education_level ?? "",
      job_title: profile.job_title ?? "",
      work_institution: profile.work_institution ?? "",
      phone: profile.phone ?? "",
      cedula_profissional: profile.cedula_profissional ?? "",
      grupo_recrutamento: profile.grupo_recrutamento ?? "",
      data_consent: !!profile.data_consent,
    }));
  }, [profile]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: async () => {
      // Garantir que o perfil recarregado (fonte de verdade) reflete o que foi
      // gravado antes de avançar para a confirmação.
      await qc.refetchQueries({ queryKey: ["meu-perfil-certificacao"] });
      toast.success("Dados guardados.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isProfessor = useMemo(
    () => /professor|educador/i.test(form.job_title ?? ""),
    [form.job_title],
  );

  const set = <K extends keyof CertificacaoData>(k: K, v: CertificacaoData[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const [tentou, setTentou] = useState(false);
  const erros = useMemo(() => validar(form), [form]);
  const mostrar = (k: string) => (tentou ? erros[k] ?? null : null);
  const blocos = BLOCOS.map((b) => {
    const comErro = b.campos.filter((c) => erros[c] && erros[c] !== VAZIO).length;
    const emFalta = b.campos.filter((c) => erros[c] === VAZIO).length;
    return { ...b, comErro, emFalta };
  });
  const totalErros = Object.keys(erros).length;

  if (isLoading) return <Skeleton className="h-[60vh] w-full" />;

  const cp = form.address_cp4 + (form.address_cp3 ? `-${form.address_cp3}` : "");

  const formulario = (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        const primeiro = CAMPOS_ORDEM.find((c) => erros[c]);
        if (primeiro) {
          document.getElementById(`cert-${primeiro}`)?.focus();
          return;
        }
        save.mutate();
      }}
      className="space-y-5"
    >
      <p className="text-sm text-muted-foreground">
        Todos os campos são obrigatórios, exceto os marcados como opcionais.
      </p>

      <Bloco n={1} title="Dados pessoais" description="Tal como aparecem no teu documento de identificação." estado={blocos[0]} tentou={tentou}>
        <FormField id="cert-first_names" label="Nome(s) próprio(s)" error={mostrar("first_names")}>
          <Input {...fieldA11y("cert-first_names", mostrar("first_names"))} className={mostrar("first_names") ? fieldErrorClass : ""} value={form.first_names} onChange={(e) => set("first_names", e.target.value)} autoComplete="given-name" />
        </FormField>
        <FormField id="cert-last_names" label="Apelido(s)" error={mostrar("last_names")}>
          <Input {...fieldA11y("cert-last_names", mostrar("last_names"))} className={mostrar("last_names") ? fieldErrorClass : ""} value={form.last_names} onChange={(e) => set("last_names", e.target.value)} autoComplete="family-name" />
        </FormField>
        <FormField id="cert-gender" label="Género" error={mostrar("gender")}>
          <SelectInput id="cert-gender" erro={!!mostrar("gender")} value={form.gender} onChange={(v) => set("gender", v)} options={GENERO} />
        </FormField>
        <FormField id="cert-birth_date" label="Data de nascimento" error={mostrar("birth_date")}>
          <Input {...fieldA11y("cert-birth_date", mostrar("birth_date"))} className={mostrar("birth_date") ? fieldErrorClass : ""} type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
        </FormField>
        <FormField id="cert-nif" label="NIF" error={mostrar("nif")}>
          <Input {...fieldA11y("cert-nif", mostrar("nif"))} className={mostrar("nif") ? fieldErrorClass : ""} inputMode="numeric" maxLength={9} value={form.nif} onChange={(e) => set("nif", e.target.value.replace(/\D/g, ""))} />
        </FormField>
        <FormField id="cert-id_doc_type" label="Tipo de documento" error={mostrar("id_doc_type")}>
          <SelectInput id="cert-id_doc_type" erro={!!mostrar("id_doc_type")} value={form.id_doc_type} onChange={(v) => set("id_doc_type", v)} options={DOC_TIPO} />
        </FormField>
        <FormField id="cert-id_doc_number" label="Número do documento" error={mostrar("id_doc_number")}>
          <Input {...fieldA11y("cert-id_doc_number", mostrar("id_doc_number"))} className={mostrar("id_doc_number") ? fieldErrorClass : ""} value={form.id_doc_number} onChange={(e) => set("id_doc_number", e.target.value)} />
        </FormField>
        <FormField id="cert-id_doc_expiry" label="Validade do documento" error={mostrar("id_doc_expiry")}>
          <Input {...fieldA11y("cert-id_doc_expiry", mostrar("id_doc_expiry"))} className={mostrar("id_doc_expiry") ? fieldErrorClass : ""} type="date" value={form.id_doc_expiry} onChange={(e) => set("id_doc_expiry", e.target.value)} />
        </FormField>
        <FormField id="cert-nationality_country" label="País de nacionalidade" error={mostrar("nationality_country")}>
          <SelectInput id="cert-nationality_country" erro={!!mostrar("nationality_country")} value={form.nationality_country} onChange={(v) => set("nationality_country", v)} options={COUNTRY_OPTIONS} />
        </FormField>
        <FormField id="cert-origin_country" label="País de origem" error={mostrar("origin_country")}>
          <SelectInput id="cert-origin_country" erro={!!mostrar("origin_country")} value={form.origin_country} onChange={(v) => set("origin_country", v)} options={COUNTRY_OPTIONS} />
        </FormField>
        <FormField id="cert-birth_concelho" label="Concelho de naturalidade" error={mostrar("birth_concelho")}>
          <SelectInput id="cert-birth_concelho" erro={!!mostrar("birth_concelho")} value={form.birth_concelho} onChange={(v) => set("birth_concelho", v)} options={PORTUGUESE_MUNICIPALITIES} />
        </FormField>
      </Bloco>

      <Bloco n={2} title="Morada" description="A tua morada de residência." estado={blocos[1]} tentou={tentou}>
        <FormField id="cert-address" label="Morada" error={mostrar("address")} className="sm:col-span-2">
          <Input {...fieldA11y("cert-address", mostrar("address"))} className={mostrar("address") ? fieldErrorClass : ""} value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" />
        </FormField>
        <FormField id="cert-cp" label="Código postal" error={mostrar("cp")} hint="Por exemplo, 1000-001.">
          <Input
            {...fieldA11y("cert-cp", mostrar("cp"), true)}
            className={mostrar("cp") ? fieldErrorClass : ""}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="1234-567"
            maxLength={8}
            value={cp}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 7);
              setForm((f) => ({ ...f, address_cp4: d.slice(0, 4), address_cp3: d.slice(4) }));
            }}
          />
        </FormField>
        <FormField id="cert-locality" label="Localidade" error={mostrar("locality")}>
          <Input {...fieldA11y("cert-locality", mostrar("locality"))} className={mostrar("locality") ? fieldErrorClass : ""} value={form.locality} onChange={(e) => set("locality", e.target.value)} />
        </FormField>
        <FormField id="cert-residence_concelho" label="Concelho de residência" error={mostrar("residence_concelho")}>
          <SelectInput id="cert-residence_concelho" erro={!!mostrar("residence_concelho")} value={form.residence_concelho} onChange={(v) => set("residence_concelho", v)} options={PORTUGUESE_MUNICIPALITIES} />
        </FormField>
      </Bloco>

      <Bloco n={3} title="Contactos" estado={blocos[2]} tentou={tentou}>
        <FormField id="cert-email" label="Email" hint="O email da tua conta.">
          <Input id="cert-email" aria-describedby="cert-email-ajuda" value={profile?.email ?? ""} disabled />
        </FormField>
        <FormField id="cert-phone" label="Telemóvel" optional error={mostrar("phone")}>
          <Input {...fieldA11y("cert-phone", mostrar("phone"))} className={mostrar("phone") ? fieldErrorClass : ""} inputMode="tel" autoComplete="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="912 345 678" />
        </FormField>
      </Bloco>

      <Bloco n={4} title="Formação e profissão" estado={blocos[3]} tentou={tentou}>
        <FormField id="cert-education_level" label="Habilitações literárias" error={mostrar("education_level")} className="sm:col-span-2">
          <SelectInput id="cert-education_level" erro={!!mostrar("education_level")} value={form.education_level} onChange={(v) => set("education_level", v)} options={HABILITACOES} />
        </FormField>
        <FormField id="cert-job_title" label="Função" error={mostrar("job_title")} className="sm:col-span-2">
          <Input
            {...fieldA11y("cert-job_title", mostrar("job_title"))}
            className={mostrar("job_title") ? fieldErrorClass : ""}
            value={form.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder="Por exemplo: professor do 1.º ciclo, encarregado de educação, técnico"
          />
        </FormField>
        <FormField id="cert-work_institution" label="Instituição onde trabalhas ou estudas" error={mostrar("work_institution")} className="sm:col-span-2">
          <Input {...fieldA11y("cert-work_institution", mostrar("work_institution"))} className={mostrar("work_institution") ? fieldErrorClass : ""} value={form.work_institution} onChange={(e) => set("work_institution", e.target.value)} />
        </FormField>
        {isProfessor && (
          <>
            <FormField id="cert-grupo" label="Grupo de recrutamento" optional hint="Só para docentes.">
              <Input id="cert-grupo" aria-describedby="cert-grupo-ajuda" value={form.grupo_recrutamento ?? ""} onChange={(e) => set("grupo_recrutamento", e.target.value)} />
            </FormField>
            <FormField id="cert-cedula" label="N.º de cédula profissional" optional>
              <Input id="cert-cedula" value={form.cedula_profissional ?? ""} onChange={(e) => set("cedula_profissional", e.target.value)} />
            </FormField>
          </>
        )}
      </Bloco>

      <section id="bloco-5" className={`scroll-mt-6 rounded-xl border bg-card p-5 ${mostrar("data_consent") ? "border-[#B42318]" : ""}`}>
        <h3 className="mb-3 text-sm font-semibold text-secondary">Autorização</h3>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <Checkbox
            id="cert-data_consent"
            checked={form.data_consent}
            onCheckedChange={(v) => set("data_consent", v === true)}
            className="mt-0.5"
            aria-invalid={mostrar("data_consent") ? true : undefined}
          />
          <span>
            Autorizo o tratamento dos meus dados pessoais para efeitos de inscrição, gestão da
            formação e emissão de certificado, nos termos do RGPD.
          </span>
        </label>
        {mostrar("data_consent") && (
          <p role="alert" className="mt-2 text-xs font-medium text-[#B42318]">
            Para guardar, tens de autorizar o tratamento dos dados.
          </p>
        )}
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Voltar
            </Button>
          )}
          {tentou && totalErros > 0 ? (
            <span role="status" className="text-xs font-medium text-[#B42318]">
              Falta corrigir ou preencher {totalErros} {totalErros === 1 ? "campo" : "campos"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {blocos.filter((b) => b.comErro === 0 && b.emFalta === 0).length} de {blocos.length} blocos completos
            </span>
          )}
        </div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "A guardar…" : "Guardar dados"}
        </Button>
      </div>
    </form>
  );

  if (!comIndice) return formulario;

  const nCompletos = blocos.filter((b) => b.comErro === 0 && b.emFalta === 0).length + (form.data_consent ? 1 : 0);
  return (
    <div className="flex flex-wrap items-start gap-6">
      <nav
        aria-label="Blocos do formulário"
        className="w-full space-y-1 lg:sticky lg:top-6 lg:w-60 lg:shrink-0"
      >
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground">
            {nCompletos} de {blocos.length + 1} blocos completos
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round((nCompletos / (blocos.length + 1)) * 100)}%` }}
            />
          </div>
        </div>
        {[...NOMES_BLOCOS, "Autorização"].map((nome, i) => {
          const b = blocos[i];
          const ok = b ? b.comErro === 0 && b.emFalta === 0 : form.data_consent;
          const erro = b ? tentou && b.comErro > 0 : tentou && !form.data_consent;
          return (
            <a
              key={nome}
              href={`#bloco-${i + 1}`}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-secondary hover:bg-card"
            >
              <span>{nome}</span>
              {ok ? (
                <CheckCircle2 className="h-4 w-4 text-[#11643F]" aria-label="completo" />
              ) : erro ? (
                <AlertCircle className="h-4 w-4 text-[#B42318]" aria-label="por corrigir" />
              ) : (
                <span className="text-xs text-muted-foreground">em falta</span>
              )}
            </a>
          );
        })}
      </nav>
      <div className="min-w-0 flex-[999_1_560px]">{formulario}</div>
    </div>
  );
}

const VAZIO = "Preenche este campo.";

const CAMPOS_ORDEM = [
  "first_names", "last_names", "gender", "birth_date", "nif", "id_doc_type", "id_doc_number",
  "id_doc_expiry", "nationality_country", "origin_country", "birth_concelho",
  "address", "cp", "locality", "residence_concelho",
  "phone",
  "education_level", "job_title", "work_institution",
  "data_consent",
];

const BLOCOS = [
  { campos: ["first_names", "last_names", "gender", "birth_date", "nif", "id_doc_type", "id_doc_number", "id_doc_expiry", "nationality_country", "origin_country", "birth_concelho"] },
  { campos: ["address", "cp", "locality", "residence_concelho"] },
  { campos: ["phone"] },
  { campos: ["education_level", "job_title", "work_institution"] },
];

/** Erros por campo. Um campo vazio obrigatório dá a mensagem VAZIO. */
function validar(f: CertificacaoData): Record<string, string> {
  const e: Record<string, string> = {};
  const obrig: (keyof CertificacaoData)[] = [
    "first_names", "last_names", "gender", "birth_date", "nif", "id_doc_type", "id_doc_number",
    "id_doc_expiry", "nationality_country", "origin_country", "birth_concelho", "address",
    "locality", "residence_concelho", "education_level", "job_title", "work_institution",
  ];
  for (const k of obrig) {
    const v = f[k];
    if (typeof v !== "string" || !v.trim()) e[k as string] = VAZIO;
  }
  if (f.birth_date && !isOlderThanTwoYears(f.birth_date)) e.birth_date = "Confirma a data: a pessoa tem de ter mais de 2 anos.";
  if (f.nif && !isValidNif(f.nif)) e.nif = "Este NIF não é válido. Confirma os 9 algarismos.";
  if (!f.address_cp4 && !f.address_cp3) e.cp = VAZIO;
  else if (!/^\d{4}$/.test(f.address_cp4) || !/^\d{3}$/.test(f.address_cp3))
    e.cp = "Escreve o código postal completo, por exemplo 1000-001.";
  if (!isValidPhone(f.phone)) e.phone = "Escreve um telemóvel português com 9 algarismos.";
  if (!f.data_consent) e.data_consent = "Autorização em falta.";
  return e;
}

function Bloco({
  n,
  title,
  description,
  estado,
  tentou,
  children,
}: {
  n: number;
  title: string;
  description?: string;
  estado: { comErro: number; emFalta: number };
  tentou: boolean;
  children: React.ReactNode;
}) {
  const completo = estado.comErro === 0 && estado.emFalta === 0;
  return (
    <section id={`bloco-${n}`} className="scroll-mt-6 space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-secondary">
            {n}
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-secondary">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {completo ? (
          <StatusChip tone="green">Completo</StatusChip>
        ) : tentou && estado.comErro > 0 ? (
          <StatusChip tone="red">
            {estado.comErro} {estado.comErro === 1 ? "campo por corrigir" : "campos por corrigir"}
          </StatusChip>
        ) : estado.emFalta > 0 ? (
          <StatusChip tone="yellow">
            {estado.emFalta} {estado.emFalta === 1 ? "campo em falta" : "campos em falta"}
          </StatusChip>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SelectInput({
  id,
  erro,
  value,
  onChange,
  options,
}: {
  id: string;
  erro?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={erro || undefined} className={erro ? fieldErrorClass : ""}>
        <SelectValue placeholder="Escolher" />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
