import type { Request, Response } from "express";
import { z } from "zod";
import { reservaService } from "../services/reservaService.ts";
import { idParam } from "../utils/idParam.ts";

const reservarSchema = z.object({
  assentoIds: z.array(z.number().int().positive()).min(1),
});

export const reservaController = {
  async criar(req: Request, res: Response) {
    const { assentoIds } = reservarSchema.parse(req.body);
    const resultado = await reservaService.criarReservas(
      req.usuario!.id,
      idParam(req.params.id),
      assentoIds,
    );
    res.status(201).json(resultado);
  },
};
