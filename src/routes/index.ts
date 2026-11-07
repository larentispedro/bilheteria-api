import { Router } from "express";
import { authRoutes } from "./authRoutes.ts";
import { eventoRoutes } from "./eventoRoutes.ts";
import { salaRoutes } from "./salaRoutes.ts";
import { sessaoRoutes } from "./sessaoRoutes.ts";
import { pagamentoRoutes } from "./pagamentoRoutes.ts";
import { ingressoRoutes } from "./ingressoRoutes.ts";
import { relatorioRoutes } from "./relatorioRoutes.ts";
import { usuarioRoutes } from "./usuarioRoutes.ts";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/eventos", eventoRoutes);
routes.use("/salas", salaRoutes);
routes.use("/sessoes", sessaoRoutes);
routes.use("/pagamentos", pagamentoRoutes);
routes.use("/ingressos", ingressoRoutes);
routes.use("/relatorios", relatorioRoutes);
routes.use("/usuarios", usuarioRoutes);
