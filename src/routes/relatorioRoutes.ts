import { Router } from "express";
import { relatorioController } from "../controllers/relatorioController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const relatorioRoutes = Router();

relatorioRoutes.use(autenticar, exigirPapel(Papel.OPERADOR));
relatorioRoutes.get("/vendas", relatorioController.vendas);
relatorioRoutes.get("/ocupacao", relatorioController.ocupacao);
relatorioRoutes.get("/vendas-detalhadas", relatorioController.vendasDetalhadas);
