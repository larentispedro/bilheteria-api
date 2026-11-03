import { Router } from "express";
import { pagamentoController } from "../controllers/pagamentoController.ts";
import { autenticar } from "../middlewares/auth.ts";

export const pagamentoRoutes = Router();

pagamentoRoutes.post("/", autenticar, pagamentoController.confirmar);
