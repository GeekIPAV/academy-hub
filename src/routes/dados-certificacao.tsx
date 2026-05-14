import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Loader2 } from "lucide-react";
import {
  getCertificationContext,
  saveCertificationData,
} from "@/lib/certification.functions";

export const Route = createFileRoute("/dados-certificacao")({
  head: () => ({ meta: [{ title: "Dados de Certificação — Academia Ubuntu" }] }),
  component: CertificationPage,
});

type FormState = {
  education_level: string;
  job_title: string;
  work_institution: string;
  full_name: string;
  id_doc_type: "CC" | "Passaporte" | "";
  id_doc_number: string;
  id_doc_expiry: string;
  nif: string;
  birth_date: string;
  nationality_country: string;
};

const EMPTY: FormState = {
  education_level: "",
  job_title: "",
  work_institution: "",
  full_name: "",
  id_doc_type: "",
  id_doc_number: "",
  id_doc_expiry: "",
  nif: "",
  birth_date: "",
  nationality_country: "",
};

function CertificationPage() {
  const navigate = useNavigate();
  const fetchCtx = useServerFn(getCertificationContext);
  const saveFn = useServerFn(saveCertificationData);

  const { data, isLoading } = useQuery({
    queryKey: ["certification-context"],
    queryFn: () => fetchCtx(),
  });

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setForm((f) => ({
        ...f,
        education_level: p.education_level ?? "",
        job_title: p.job_title ?? "",
        work_institution: p.work_institution ?? "",
        full_name: p.full_name ?? "",
        id_doc_type:
          p.id_doc_type === "CC" || p.id_doc_type === "Passaporte" ? p.id_doc_type : "",
        id_doc_number: p.id_doc_number ?? "",
        id_doc_expiry: p.id_doc_expiry ?? "",
        nif: p.nif ?? "",
        birth_date: p.birth_date ?? "",
        nationality_country: p.nationality_country ?? "",
      }));
    }
  }, [data]);

  useEffect(() => {
    if (!isLoading && data && !data.isFormando) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, data, navigate]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data.isFormando) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const step1Valid =
    form.education_level.trim() && form.job_title.trim() && form.work_institution.trim();

  const step2Valid =
    form.full_name.trim().length >= 2 &&
    (form.id_doc_type === "CC" || form.id_doc_type === "Passaporte") &&
    form.id_doc_number.trim() &&
    form.id_doc_expiry &&
    form.nif.trim() &&
    form.birth_date &&
    form.nationality_country.trim();

  const handleNext = () => {
    if (!step1Valid) {
      toast.error("Preenche todos os campos para continuar.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!step2Valid) {
      toast.error("Todos os campos são obrigatórios para emissão de certificado.");
      return;
    }
    setSubmitting(true);
    try {
      await saveFn({
        data: {
          ...form,
          id_doc_type: form.id_doc_type as "CC" | "Passaporte",
        },
      });
      toast.success("Dados guardados com sucesso. Bem-vindo à Academia Ubuntu!");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar dados.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dados de Certificação</h1>
        <p className="text-sm text-muted-foreground">
          Passo {step} de 2 — {step === 1 ? "Enquadramento profissional" : "Dados oficiais"}
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Enquadramento Profissional</CardTitle>
            <CardDescription>Conta-nos um pouco sobre o teu percurso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="education_level">Nível de escolaridade *</Label>
              <Input
                id="education_level"
                value={form.education_level}
                onChange={(e) => set("education_level", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Profissão / cargo *</Label>
              <Input
                id="job_title"
                value={form.job_title}
                onChange={(e) => set("job_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_institution">Instituição / empresa *</Label>
              <Input
                id="work_institution"
                value={form.work_institution}
                onChange={(e) => set("work_institution", e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!step1Valid}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados Oficiais (Certificado)</CardTitle>
            <CardDescription>
              Confirma os teus dados pessoais para emissão do certificado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Dados obrigatórios</AlertTitle>
              <AlertDescription>
                Estes dados são estritamente necessários e obrigatórios para a emissão do
                seu certificado de participação.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo (igual ao documento) *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <Select
                  value={form.id_doc_type || undefined}
                  onValueChange={(v) => set("id_doc_type", v as "CC" | "Passaporte")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cartão de Cidadão</SelectItem>
                    <SelectItem value="Passaporte">Passaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_doc_number">Número do documento *</Label>
                <Input
                  id="id_doc_number"
                  value={form.id_doc_number}
                  onChange={(e) => set("id_doc_number", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_doc_expiry">Validade do documento *</Label>
                <Input
                  id="id_doc_expiry"
                  type="date"
                  value={form.id_doc_expiry}
                  onChange={(e) => set("id_doc_expiry", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif">NIF *</Label>
                <Input
                  id="nif"
                  value={form.nif}
                  onChange={(e) => set("nif", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de nascimento *</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality_country">Nacionalidade *</Label>
                <Input
                  id="nationality_country"
                  value={form.nationality_country}
                  onChange={(e) => set("nationality_country", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={!step2Valid || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A guardar...
                  </>
                ) : (
                  "Guardar e ativar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
