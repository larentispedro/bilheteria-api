import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.ts";
import { Papel } from "../src/generated/prisma/enums.ts";

// Em produção (ou com SEED_APENAS_OPERADOR=true) o seed cria só o usuário
// operador — sem cliente, filme, sala ou sessão de demonstração.
const apenasOperador =
  process.env.NODE_ENV === "production" || process.env.SEED_APENAS_OPERADOR === "true";

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  const operador = await prisma.usuario.upsert({
    where: { email: "operador@cinema.com" },
    update: {},
    create: {
      nome: "Operador Padrão",
      email: "operador@cinema.com",
      senhaHash,
      papel: Papel.OPERADOR,
    },
  });

  if (apenasOperador) {
    console.log("Seed concluído (modo produção: só o operador padrão).");
    console.log(`Operador: operador@cinema.com / 123456 (id ${operador.id})`);
    return;
  }

  await prisma.usuario.upsert({
    where: { email: "cliente@teste.com" },
    update: {},
    create: {
      nome: "Cliente Teste",
      email: "cliente@teste.com",
      senhaHash,
      papel: Papel.CLIENTE,
    },
  });

  const evento = await prisma.evento.create({
    data: {
      titulo: "Filme de Demonstração",
      descricao: "Sessão de exemplo para testar o sistema",
      duracaoMinutos: 120,
    },
  });

  const sala = await prisma.sala.create({ data: { nome: "Sala 1" } });

  const filas = ["A", "B", "C"];
  await prisma.assento.createMany({
    data: filas.flatMap((fila) =>
      Array.from({ length: 8 }, (_, i) => ({ salaId: sala.id, fila, numero: i + 1 })),
    ),
  });

  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.sessao.create({
    data: { eventoId: evento.id, salaId: sala.id, dataHora: amanha, preco: 25 },
  });

  console.log("Seed concluído.");
  console.log(`Operador: operador@cinema.com / 123456 (id ${operador.id})`);
  console.log("Cliente: cliente@teste.com / 123456");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
