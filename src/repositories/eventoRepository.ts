import { prisma } from "../config/prisma.ts";

export const eventoRepository = {
  listar() {
    return prisma.evento.findMany({ orderBy: { titulo: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.evento.findUnique({ where: { id } });
  },

  criar(dados: { titulo: string; descricao?: string; duracaoMinutos: number }) {
    return prisma.evento.create({ data: dados });
  },

  atualizar(id: number, dados: { titulo?: string; descricao?: string; duracaoMinutos?: number }) {
    return prisma.evento.update({ where: { id }, data: dados });
  },

  remover(id: number) {
    return prisma.evento.delete({ where: { id } });
  },
};
