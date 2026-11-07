import type { Request, Response } from "express";
import { z } from "zod";
import { eventoService } from "../services/eventoService.ts";
import { idParam } from "../utils/idParam.ts";

const eventoSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  duracaoMinutos: z.number().int().positive(),
});

export const eventoController = {
  async listar(_req: Request, res: Response) {
    res.json(await eventoService.listar());
  },

  async buscar(req: Request, res: Response) {
    res.json(await eventoService.buscarPorId(idParam(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const dados = eventoSchema.parse(req.body);
    res.status(201).json(await eventoService.criar(dados));
  },

  async atualizar(req: Request, res: Response) {
    const dados = eventoSchema.partial().parse(req.body);
    res.json(await eventoService.atualizar(idParam(req.params.id), dados));
  },

  async remover(req: Request, res: Response) {
    await eventoService.remover(idParam(req.params.id));
    res.status(204).send();
  },
};
