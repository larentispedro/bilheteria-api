import { Router } from "express";
import { authController } from "../controllers/authController.ts";

export const authRoutes = Router();

authRoutes.post("/registrar", authController.registrar);
authRoutes.post("/login", authController.login);
