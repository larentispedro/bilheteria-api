import { prisma } from "../config/prisma.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

export const relatorioRepository = {
  /** Vendas (junta vendas, usuarios, ingressos, reservas, sessoes e eventos). */
  vendas() {
    return prisma.venda.findMany({
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        ingressos: {
          include: {
            reserva: {
              include: {
                sessao: { include: { evento: true, sala: true } },
                assento: true,
              },
            },
          },
        },
      },
      orderBy: { criadaEm: "desc" },
    });
  },

  /** Ocupação por sessão (junta sessoes, eventos, salas, assentos e reservas). */
  ocupacao(sessaoId?: number) {
    return prisma.sessao.findMany({
      where: sessaoId ? { id: sessaoId } : undefined,
      include: {
        evento: true,
        sala: { include: { assentos: true } },
        reservas: {
          where: {
            OR: [
              { status: StatusReserva.PAGO },
              { status: StatusReserva.RESERVADO, expiraEm: { gte: new Date() } },
            ],
          },
        },
      },
      orderBy: { dataHora: "asc" },
    });
  },
};
