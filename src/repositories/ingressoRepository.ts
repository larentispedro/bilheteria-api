import { prisma } from "../config/prisma.ts";
import { StatusIngresso } from "../generated/prisma/enums.ts";

export const ingressoRepository = {
  buscarPorCodigo(codigoUnico: string) {
    return prisma.ingresso.findUnique({
      where: { codigoUnico },
      include: {
        reserva: {
          include: {
            sessao: { include: { evento: true } },
            assento: true,
            usuario: { select: { id: true, nome: true, email: true } },
          },
        },
      },
    });
  },

  /**
   * Marca como utilizado só se ainda estiver VALIDO — `count` vem 0 se outra
   * validação concorrente já tiver vencido essa corrida (ver ingressoService.validar).
   */
  marcarUtilizado(id: number) {
    return prisma.ingresso.updateMany({
      where: { id, status: StatusIngresso.VALIDO },
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
