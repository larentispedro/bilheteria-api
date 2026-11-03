import { Router } from "express";
import { salaController } from "../controllers/salaController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const salaRoutes = Router();

salaRoutes.get("/", salaController.listar);
salaRoutes.get("/:id", salaController.buscar);
salaRoutes.post("/", autenticar, exigirPapel(Papel.OPERADOR), salaController.criar);
salaRoutes.put("/:id", autenticar, exigirPapel(Papel.OPERADOR), salaController.atualizar);
salaRoutes.delete("/:id", autenticar, exigirPapel(Papel.OPERADOR), salaController.remover);
salaRoutes.post(
  "/:id/assentos",
  autenticar,
  exigirPapel(Papel.OPERADOR),
  salaController.gerarAssentos,
);
