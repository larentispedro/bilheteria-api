import { prisma } from "../config/prisma.ts";

export const assentoRepository = {
  listarPorSala(salaId: number) {
    return prisma.assento.findMany({
      where: { salaId },
      orderBy: [{ fila: "asc" }, { numero: "asc" }],
    });
  },

  criarMuitos(salaId: number, assentos: Array<{ fila: string; numero: number }>) {
    return prisma.assento.createMany({
      data: assentos.map((a) => ({ salaId, fila: a.fila, numero: a.numero })),
    });
  },

  buscarPorIds(ids: number[]) {
    return prisma.assento.findMany({ where: { id: { in: ids } } });
  },
};
