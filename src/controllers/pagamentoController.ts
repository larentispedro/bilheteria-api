import type { Request, Response } from "express";
import { z } from "zod";
import { pagamentoService } from "../services/pagamentoService.ts";

const pagamentoSchema = z.object({
  reservaIds: z.array(z.number().int().positive()).min(1),
});

export const pagamentoController = {
  async confirmar(req: Request, res: Response) {
    const { reservaIds } = pagamentoSchema.parse(req.body);
    const resultado = await pagamentoService.confirmarPagamento(req.usuario!.id, reservaIds);
    res.status(201).json(resultado);
  },
};
