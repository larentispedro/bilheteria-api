import "dotenv/config";

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida`);
  }
  return valor;
}

export const env = {
  databaseUrl: obrigatoria("DATABASE_URL"),
  jwtSecret: obrigatoria("JWT_SECRET"),
  jwtExpiresIn: process.env["JWT_EXPIRES_IN"] ?? "8h",
  port: Number(process.env["PORT"] ?? 3000),
  reservaExpiracaoMinutos: Number(process.env["RESERVA_EXPIRACAO_MINUTOS"] ?? 10),
};
