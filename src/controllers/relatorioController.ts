import type { Request, Response } from "express";
import { relatorioService } from "../services/relatorioService.ts";

export const relatorioController = {
  async vendas(_req: Request, res: Response) {
    res.json(await relatorioService.vendas());
  },

  async ocupacao(req: Request, res: Response) {
    const sessaoId = req.query.sessaoId ? Number(req.query.sessaoId) : undefined;
    res.json(await relatorioService.ocupacao(sessaoId));
  },
};
