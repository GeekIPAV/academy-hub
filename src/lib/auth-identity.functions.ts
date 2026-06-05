import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export interface VerifyAuthEmailResult {
  exists: boolean;
}

/**
 * Verifica se já existe um utilizador na tabela `utilizadores` com este email.
 * Usado pelo ecrã de autenticação para decidir entre fluxo de Entrar vs Criar conta.
 * Não devolve PII (nome) para evitar enumeração não autenticada.
 */
export const verifyAuthEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => emailSchema.parse(input))
  .handler(async ({ data }): Promise<VerifyAuthEmailResult> => {
    const { data: row, error } = await supabaseAdmin
      .from("utilizadores")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { exists: !!row };
  });
