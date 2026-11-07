import type { Request, Response } from "express";
import { z } from "zod";
import { usuarioService } from "../services/usuarioService.ts";
import { Papel } from "../generated/prisma/enums.ts";

const criarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: z.enum([Papel.CLIENTE, Papel.OPERADOR]),
});

export const usuarioController = {
  async listar(_req: Request, res: Response) {
    res.json(await usuarioService.listar());
  },

  async criar(req: Request, res: Response) {
    const dados = criarUsuarioSchema.parse(req.body);
    res.status(201).json(await usuarioService.criar(dados));
  },
};
