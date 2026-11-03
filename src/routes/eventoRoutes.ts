import { Router } from "express";
import { eventoController } from "../controllers/eventoController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const eventoRoutes = Router();

eventoRoutes.get("/", eventoController.listar);
eventoRoutes.get("/:id", eventoController.buscar);
eventoRoutes.post("/", autenticar, exigirPapel(Papel.OPERADOR), eventoController.criar);
eventoRoutes.put("/:id", autenticar, exigirPapel(Papel.OPERADOR), eventoController.atualizar);
eventoRoutes.delete("/:id", autenticar, exigirPapel(Papel.OPERADOR), eventoController.remover);
