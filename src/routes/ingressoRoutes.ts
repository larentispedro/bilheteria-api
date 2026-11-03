import { Router } from "express";
import { ingressoController } from "../controllers/ingressoController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const ingressoRoutes = Router();

ingressoRoutes.get("/meus", autenticar, ingressoController.meusIngressos);
ingressoRoutes.get(
  "/:codigo",
  autenticar,
  exigirPapel(Papel.OPERADOR),
  ingressoController.buscar,
);
ingressoRoutes.post(
  "/:codigo/validar",
  autenticar,
  exigirPapel(Papel.OPERADOR),
  ingressoController.validar,
);
