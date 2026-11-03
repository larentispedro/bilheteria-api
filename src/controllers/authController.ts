import type { Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/authService.ts";
import { Papel } from "../generated/prisma/enums.ts";

const registrarSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: z.enum([Papel.CLIENTE, Papel.OPERADOR]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const authController = {
  async registrar(req: Request, res: Response) {
    const dados = registrarSchema.parse(req.body);
    const resultado = await authService.registrar(dados);
    res.status(201).json(resultado);
  },

  async login(req: Request, res: Response) {
    const { email, senha } = loginSchema.parse(req.body);
    const resultado = await authService.login(email, senha);
    res.json(resultado);
  },
};
