import { prisma } from "../config/prisma.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

export interface LinhaVendaDetalhada {
  vendaId: number;
  dataVenda: Date;
  comprador: string;
  filme: string;
  sala: string;
  dataHoraSessao: Date;
  assento: string;
  preco: Prisma.Decimal;
  codigoIngresso: string;
  statusIngresso: string;
}

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

  /**
   * Relatório gerencial em SQL puro (peso 3): uma linha por ingresso vendido,
   * juntando 8 tabelas em um único JOIN explícito (os relatórios acima usam
   * `include` do Prisma, que gera várias consultas por trás).
   *
   *   vendas     -> data da venda
   *   usuarios   -> nome do comprador (venda.usuarioId)
   *   ingressos  -> código e status do ingresso vendido nessa venda
   *   reservas   -> liga o ingresso ao assento e à sessão reservados
   *   assentos   -> fila/número do assento (reserva.assentoId)
   *   sessoes    -> data/hora e preço da sessão (reserva.sessaoId)
   *   eventos    -> título do filme da sessão (sessao.eventoId)
   *   salas      -> nome da sala da sessão (sessao.salaId)
   */
  vendasDetalhadas() {
    return prisma.$queryRaw<LinhaVendaDetalhada[]>(Prisma.sql`
      SELECT
        v."id"                                AS "vendaId",
        v."criadaEm"                          AS "dataVenda",
        u."nome"                              AS "comprador",
        ev."titulo"                           AS "filme",
        sl."nome"                             AS "sala",
        s."dataHora"                          AS "dataHoraSessao",
        (a."fila" || a."numero"::text)        AS "assento",
        s."preco"                             AS "preco",
        i."codigoUnico"                       AS "codigoIngresso",
        i."status"::text                      AS "statusIngresso"
      FROM "vendas" v
      JOIN "usuarios" u  ON u."id" = v."usuarioId"
      JOIN "ingressos" i ON i."vendaId" = v."id"
      JOIN "reservas" r  ON r."id" = i."reservaId"
      JOIN "assentos" a  ON a."id" = r."assentoId"
      JOIN "sessoes" s   ON s."id" = r."sessaoId"
      JOIN "eventos" ev  ON ev."id" = s."eventoId"
      JOIN "salas" sl    ON sl."id" = s."salaId"
      ORDER BY v."criadaEm" DESC, i."id" DESC
    `);
  },
};
