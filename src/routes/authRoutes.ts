import { Router } from "express";
import { authController } from "../controllers/authController.ts";
import { autenticar } from "../middlewares/auth.ts";

export const authRoutes = Router();

authRoutes.post("/registrar", authController.registrar);
authRoutes.post("/login", authController.login);
authRoutes.get("/me", autenticar, authController.me);
