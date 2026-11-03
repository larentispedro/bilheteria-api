import type { Request, Response } from "express";
import { ingressoService } from "../services/ingressoService.ts";

export const ingressoController = {
  async meusIngressos(req: Request, res: Response) {
    res.json(await ingressoService.meusIngressos(req.usuario!.id));
  },

  async buscar(req: Request, res: Response) {
    res.json(await ingressoService.buscarPorCodigo(req.params.codigo as string));
  },

  async validar(req: Request, res: Response) {
    res.json(await ingressoService.validar(req.params.codigo as string));
  },
};
