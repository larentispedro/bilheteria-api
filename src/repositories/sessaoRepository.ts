import { prisma } from "../config/prisma.ts";

export const sessaoRepository = {
  listar() {
    return prisma.sessao.findMany({
      include: { evento: true, sala: true },
      orderBy: { dataHora: "asc" },
    });
  },

  buscarPorId(id: number) {
    return prisma.sessao.findUnique({
      where: { id },
      include: { evento: true, sala: { include: { assentos: true } } },
    });
  },

  criar(dados: { eventoId: number; salaId: number; dataHora: Date; preco: number }) {
    return prisma.sessao.create({ data: dados });
  },

  atualizar(
    id: number,
    dados: Partial<{ eventoId: number; salaId: number; dataHora: Date; preco: number }>,
  ) {
    return prisma.sessao.update({ where: { id }, data: dados });
  },

  remover(id: number) {
    return prisma.sessao.delete({ where: { id } });
  },
};
