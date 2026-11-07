import { AppError } from "./AppError.ts";

/** Converte um parâmetro de rota (`:id`) em inteiro, ou falha com 400 — evita mandar `NaN` ao Prisma. */
export function idParam(valor: string | string[]): number {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  const id = Number(bruto);
  if (!Number.isInteger(id)) {
    throw new AppError("Identificador inválido na URL", 400);
  }
  return id;
}
