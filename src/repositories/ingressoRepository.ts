import { prisma } from "../config/prisma.ts";
import { StatusIngresso } from "../generated/prisma/enums.ts";

export const ingressoRepository = {
  buscarPorCodigo(codigoUnico: string) {
    return prisma.ingresso.findUnique({
      where: { codigoUnico },
      include: {
        reserva: { include: { sessao: { include: { evento: true } }, assento: true, usuario: true } },
      },
    });
  },

  marcarUtilizado(id: number) {
    return prisma.ingresso.update({
      where: { id },
      data: { status: StatusIngresso.UTILIZADO, utilizadoEm: new Date() },
    });
  },

  listarPorUsuario(usuarioId: number) {
    return prisma.ingresso.findMany({
      where: { reserva: { usuarioId } },
      include: { reserva: { include: { sessao: { include: { evento: true } }, assento: true } } },
      orderBy: { emitidoEm: "desc" },
    });
  },

  listarPorVenda(vendaId: number) {
    return prisma.ingresso.findMany({
      where: { vendaId },
      include: { reserva: { include: { sessao: { include: { evento: true } }, assento: true } } },
    });
  },

  buscarPorIds(ids: number[]) {
    return prisma.ingresso.findMany({
      where: { id: { in: ids } },
      include: { reserva: { include: { sessao: { include: { evento: true } }, assento: true } } },
    });
  },
};
