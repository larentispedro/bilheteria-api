import { app } from "./app.ts";
import { env } from "./config/env.ts";

app.listen(env.port, () => {
  console.log(`Backend rodando em http://localhost:${env.port}`);
});
