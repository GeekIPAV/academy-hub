import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const GENERO = ["Feminino", "Masculino", "Outro", "Prefiro não responder"];
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
const FUNCAO = [
  "Professor/Educador",
  "Aluno/Estudante",
  "Encarregado de Educação",
  "Técnico",
  "Voluntário",
  "Outra",
];

type Profile = Awaited<ReturnType<typeof getMeuPerfilCertificacao>>;

interface Props {
  onSaved: () => void;
  onCancel?: () => void;
}

export function CertificacaoForm({ onSaved, onCancel }: Props) {
  const fetchFn = useServerFn(getMeuPerfilCertificacao);
  const saveFn = useServerFn(saveMeuPerfilCertificacao);

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
    onSuccess: () => {
      toast.success("Dados guardados.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isProfessor = useMemo(
    () => /professor|educador/i.test(form.job_title ?? ""),
    [form.job_title],
  );
  const isEncEducacao = useMemo(
    () => /encarregado/i.test(form.job_title ?? ""),
    [form.job_title],
  );

  const set = <K extends keyof CertificacaoData>(k: K, v: CertificacaoData[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  if (isLoading) return <Skeleton className="h-[60vh] w-full" />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.data_consent) {
          toast.error("Tens de aceitar o tratamento de dados.");
          return;
        }
        save.mutate();
      }}
      className="space-y-6"
    >
      <Section title="Dados Pessoais">
        <Field label="Nome(s) próprio(s)" required>
          <Input value={form.first_names} onChange={(e) => set("first_names", e.target.value)} required />
        </Field>
        <Field label="Apelido(s)" required>
          <Input value={form.last_names} onChange={(e) => set("last_names", e.target.value)} required />
        </Field>
        <Field label="Género" required>
          <SelectInput value={form.gender} onChange={(v) => set("gender", v)} options={GENERO} />
        </Field>
        <Field label="Data de Nascimento" required>
          <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} required />
        </Field>
        <Field label="NIF" required>
          <Input inputMode="numeric" value={form.nif} onChange={(e) => set("nif", e.target.value)} required />
        </Field>
        <Field label="Tipo de Doc. Identificação" required>
          <SelectInput value={form.id_doc_type} onChange={(v) => set("id_doc_type", v)} options={DOC_TIPO} />
        </Field>
        <Field label="Nº Documento" required>
          <Input value={form.id_doc_number} onChange={(e) => set("id_doc_number", e.target.value)} required />
        </Field>
        <Field label="Validade do Documento" required>
          <Input type="date" value={form.id_doc_expiry} onChange={(e) => set("id_doc_expiry", e.target.value)} required />
        </Field>
        <Field label="País de Nacionalidade" required>
          <Input value={form.nationality_country} onChange={(e) => set("nationality_country", e.target.value)} required />
        </Field>
        <Field label="País de Origem" required>
          <Input value={form.origin_country} onChange={(e) => set("origin_country", e.target.value)} required />
        </Field>
        <Field label="Concelho de Naturalidade" required>
          <Input value={form.birth_concelho} onChange={(e) => set("birth_concelho", e.target.value)} required />
        </Field>
      </Section>

      <Section title="Morada">
        <Field label="Morada" required className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} required />
        </Field>
        <Field label="Código Postal (4 dígitos)" required>
          <Input inputMode="numeric" maxLength={4} value={form.address_cp4} onChange={(e) => set("address_cp4", e.target.value)} required />
        </Field>
        <Field label="Código Postal (3 dígitos)" required>
          <Input inputMode="numeric" maxLength={3} value={form.address_cp3} onChange={(e) => set("address_cp3", e.target.value)} required />
        </Field>
        <Field label="Localidade" required>
          <Input value={form.locality} onChange={(e) => set("locality", e.target.value)} required />
        </Field>
        <Field label="Concelho de Residência" required>
          <Input value={form.residence_concelho} onChange={(e) => set("residence_concelho", e.target.value)} required />
        </Field>
      </Section>

      <Section title="Contactos">
        <Field label="Email">
          <Input value={profile?.email ?? ""} disabled />
        </Field>
        <Field label="Telemóvel">
          <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </Section>

      <Section title="Formação e Profissão">
        <Field label="Habilitações Literárias" required>
          <SelectInput value={form.education_level} onChange={(v) => set("education_level", v)} options={HABILITACOES} />
        </Field>
        <Field label="Função Laboral" required className="sm:col-span-2">
          <Input
            value={form.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder="Ex.: Professor do 1.º ciclo, Encarregado de Educação, Técnico…"
            required
          />
        </Field>
        <Field label="Instituição onde trabalha/estuda" required className="sm:col-span-2">
          <Input value={form.work_institution} onChange={(e) => set("work_institution", e.target.value)} required />
        </Field>
        {isProfessor && (
          <>
            <Field label="Grupo de Recrutamento">
              <Input value={form.grupo_recrutamento ?? ""} onChange={(e) => set("grupo_recrutamento", e.target.value)} />
            </Field>
            <Field label="Nº de cédula profissional">
              <Input value={form.cedula_profissional ?? ""} onChange={(e) => set("cedula_profissional", e.target.value)} />
            </Field>
          </>
        )}
      </Section>

      <div className="rounded-md border bg-muted/30 p-3">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={form.data_consent}
            onCheckedChange={(v) => set("data_consent", v === true)}
            className="mt-0.5"
          />
          <span>
            Autorizo o tratamento dos meus dados pessoais para efeitos de inscrição, gestão da
            formação e emissão de certificado, nos termos do RGPD.
          </span>
        </label>
      </div>

      <div className="flex justify-between gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Voltar
          </Button>
        ) : <div />}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "A guardar…" : "Guardar e continuar"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecionar…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
