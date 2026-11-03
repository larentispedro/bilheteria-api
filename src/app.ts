import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { routes } from "./routes/index.ts";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

app.use(errorHandler);
