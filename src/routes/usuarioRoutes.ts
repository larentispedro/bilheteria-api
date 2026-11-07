import { Router } from "express";
import { usuarioController } from "../controllers/usuarioController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const usuarioRoutes = Router();

// Cadastro e listagem de usuários (inclusive operadores) só para quem já é OPERADOR.
usuarioRoutes.get("/", autenticar, exigirPapel(Papel.OPERADOR), usuarioController.listar);
usuarioRoutes.post("/", autenticar, exigirPapel(Papel.OPERADOR), usuarioController.criar);
