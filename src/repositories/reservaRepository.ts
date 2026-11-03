import { prisma, type DB } from "../config/prisma.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

export const reservaRepository = {
  /** Reservas ainda válidas (ocupam o assento) de uma sessão: RESERVADO não expirado ou PAGO. */
  listarAtivasPorSessao(sessaoId: number) {
    return prisma.reserva.findMany({
      where: {
        sessaoId,
        OR: [
          { status: StatusReserva.PAGO },
          { status: StatusReserva.RESERVADO, expiraEm: { gte: new Date() } },
        ],
      },
    });
  },

  /**
   * Trava, para o resto da transação, cada par (sessão, assento) usando
   * advisory lock do Postgres. Diferente de um `SELECT ... FOR UPDATE`,
   * isso também serializa a disputa quando ainda não existe nenhuma linha
   * de reserva para o assento (primeira reserva daquele assento na sessão).
   * O lock é liberado automaticamente no fim da transação (xact).
   */
  async travarAssentosDaSessao(db: DB, sessaoId: number, assentoIds: number[]) {
    for (const assentoId of assentoIds.toSorted((a, b) => a - b)) {
      await db.$queryRaw`SELECT pg_advisory_xact_lock(${sessaoId}, ${assentoId})`;
    }
  },

  buscarConflitantes(db: DB, sessaoId: number, assentoIds: number[]) {
    return db.reserva.findMany({
      where: {
        sessaoId,
        assentoId: { in: assentoIds },
        OR: [
          { status: StatusReserva.PAGO },
          { status: StatusReserva.RESERVADO, expiraEm: { gte: new Date() } },
        ],
      },
    });
  },

  criarMuitas(
    db: DB,
    dados: Array<{ sessaoId: number; assentoId: number; usuarioId: number; expiraEm: Date }>,
  ) {
    return db.reserva.createManyAndReturn({ data: dados });
  },

  buscarPorIds(ids: number[]) {
    return prisma.reserva.findMany({ where: { id: { in: ids } }, include: { sessao: true } });
  },

  buscarPorUsuario(usuarioId: number) {
    return prisma.reserva.findMany({
      where: { usuarioId },
      include: { sessao: { include: { evento: true } }, assento: true, ingresso: true },
      orderBy: { criadaEm: "desc" },
    });
  },
};
