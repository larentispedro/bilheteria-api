import type { Request, Response } from "express";
import { z } from "zod";
import { sessaoService } from "../services/sessaoService.ts";
import { idParam } from "../utils/idParam.ts";

const sessaoSchema = z.object({
  eventoId: z.number().int().positive(),
  salaId: z.number().int().positive(),
  dataHora: z.coerce.date(),
  preco: z.number().positive(),
});

export const sessaoController = {
  async listar(_req: Request, res: Response) {
    res.json(await sessaoService.listar());
  },

  async buscar(req: Request, res: Response) {
    res.json(await sessaoService.buscarPorId(idParam(req.params.id)));
  },

  async criar(req: Request, res: Response) {
    const dados = sessaoSchema.parse(req.body);
    res.status(201).json(await sessaoService.criar(dados));
  },

  async atualizar(req: Request, res: Response) {
    const dados = sessaoSchema.partial().parse(req.body);
    res.json(await sessaoService.atualizar(idParam(req.params.id), dados));
  },

  async remover(req: Request, res: Response) {
    await sessaoService.remover(idParam(req.params.id));
    res.status(204).send();
  },

  async mapaDeAssentos(req: Request, res: Response) {
    res.json(await sessaoService.mapaDeAssentos(idParam(req.params.id)));
  },
};
