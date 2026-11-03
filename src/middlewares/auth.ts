import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { AppError } from "../utils/AppError.ts";
import type { Papel } from "../generated/prisma/enums.ts";

export interface UsuarioAutenticado {
  id: number;
  papel: Papel;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    throw new AppError("Token de autenticação não informado", 401);
  }

  const token = cabecalho.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as UsuarioAutenticado;
    req.usuario = { id: payload.id, papel: payload.papel };
    next();
  } catch {
    throw new AppError("Token de autenticação inválido ou expirado", 401);
  }
}

export function exigirPapel(...papeis: Papel[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      throw new AppError("Acesso não permitido para este usuário", 403);
    }
    next();
  };
}
