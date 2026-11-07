import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.ts";
import { AppError } from "../utils/AppError.ts";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.status).json({ erro: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({ erro: "Dados inválidos", detalhes: err.issues });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      res.status(409).json({ erro: "Este registro está em uso por outro cadastro e não pode ser alterado" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ erro: "Registro não encontrado" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ erro: "Já existe um registro com esse valor único" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor" });
}
