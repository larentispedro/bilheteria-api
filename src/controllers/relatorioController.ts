import type { Request, Response } from "express";
import { relatorioService } from "../services/relatorioService.ts";
import { relatorioPdfService } from "../services/relatorioPdfService.ts";

export const relatorioController = {
  async vendas(_req: Request, res: Response) {
    res.json(await relatorioService.vendas());
  },

  async ocupacao(req: Request, res: Response) {
    const sessaoId = req.query.sessaoId ? Number(req.query.sessaoId) : undefined;
    res.json(await relatorioService.ocupacao(sessaoId));
  },

  async vendasDetalhadas(_req: Request, res: Response) {
    res.json(await relatorioService.vendasDetalhadas());
  },

  async vendasPdf(_req: Request, res: Response) {
    const dados = await relatorioService.vendas();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="relatorio-vendas.pdf"');
    const doc = relatorioPdfService.vendas(dados);
    doc.pipe(res);
    doc.end();
  },

  async ocupacaoPdf(req: Request, res: Response) {
    const sessaoId = req.query.sessaoId ? Number(req.query.sessaoId) : undefined;
    const dados = await relatorioService.ocupacao(sessaoId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="relatorio-ocupacao.pdf"');
    const doc = relatorioPdfService.ocupacao(dados);
    doc.pipe(res);
    doc.end();
  },
};
