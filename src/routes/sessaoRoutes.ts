import { Router } from "express";
import { sessaoController } from "../controllers/sessaoController.ts";
import { reservaController } from "../controllers/reservaController.ts";
import { autenticar, exigirPapel } from "../middlewares/auth.ts";
import { Papel } from "../generated/prisma/enums.ts";

export const sessaoRoutes = Router();

sessaoRoutes.get("/", sessaoController.listar);
sessaoRoutes.get("/:id", sessaoController.buscar);
sessaoRoutes.get("/:id/mapa-assentos", sessaoController.mapaDeAssentos);
sessaoRoutes.post("/", autenticar, exigirPapel(Papel.OPERADOR), sessaoController.criar);
sessaoRoutes.put("/:id", autenticar, exigirPapel(Papel.OPERADOR), sessaoController.atualizar);
sessaoRoutes.delete("/:id", autenticar, exigirPapel(Papel.OPERADOR), sessaoController.remover);
sessaoRoutes.post("/:id/reservas", autenticar, reservaController.criar);
