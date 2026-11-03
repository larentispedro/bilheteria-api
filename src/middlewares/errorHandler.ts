import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
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

  console.error(err);
  res.status(500).json({ erro: "Erro interno no servidor" });
}
