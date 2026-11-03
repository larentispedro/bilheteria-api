import { prisma } from "../config/prisma.ts";

export const salaRepository = {
  listar() {
    return prisma.sala.findMany({ orderBy: { nome: "asc" } });
  },

  buscarPorId(id: number) {
    return prisma.sala.findUnique({ where: { id }, include: { assentos: true } });
  },

  criar(dados: { nome: string }) {
    return prisma.sala.create({ data: dados });
  },

  atualizar(id: number, dados: { nome?: string }) {
    return prisma.sala.update({ where: { id }, data: dados });
  },

  remover(id: number) {
    return prisma.sala.delete({ where: { id } });
  },
};
