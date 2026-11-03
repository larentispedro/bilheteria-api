import type { Request, Response } from "express";
import { z } from "zod";
import { salaService } from "../services/salaService.ts";

const salaSchema = z.object({ nome: z.string().min(1) });

const gerarAssentosSchema = z.object({
  filas: z.array(z.string().min(1)).min(1),
  assentosPorFila: z.number().int().positive(),
});

export const salaController = {
  async listar(_req: Request, res: Response) {
    res.json(await salaService.listar());
  },

  async buscar(req: Request, res: Response) {
    res.json(await salaService.buscarPorId(Number(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const dados = salaSchema.parse(req.body);
    res.status(201).json(await salaService.criar(dados));
  },

  async atualizar(req: Request, res: Response) {
    const dados = salaSchema.partial().parse(req.body);
    res.json(await salaService.atualizar(Number(req.params.id), dados));
  },

  async remover(req: Request, res: Response) {
    await salaService.remover(Number(req.params.id));
    res.status(204).send();
  },

  async gerarAssentos(req: Request, res: Response) {
    const { filas, assentosPorFila } = gerarAssentosSchema.parse(req.body);
    res.status(201).json(await salaService.gerarAssentos(Number(req.params.id), filas, assentosPorFila));
  },
};
