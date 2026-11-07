import { prisma } from "../config/prisma.ts";
import { env } from "../config/env.ts";
import { assentoRepository } from "../repositories/assentoRepository.ts";
import { reservaRepository } from "../repositories/reservaRepository.ts";
import { sessaoRepository } from "../repositories/sessaoRepository.ts";
import { AppError } from "../utils/AppError.ts";

export const reservaService = {
  /**
   * Cria reservas temporárias para os assentos escolhidos de uma sessão.
   * Regra central: um assento de uma sessão não pode ser reservado/vendido
   * duas vezes, mesmo sob concorrência (advisory lock + índice único parcial
   * no banco, ver migration + trigger).
   */
  async criarReservas(usuarioId: number, sessaoId: number, assentoIds: number[]) {
    const idsUnicos = [...new Set(assentoIds)];
    if (idsUnicos.length === 0) {
      throw new AppError("Selecione ao menos um assento", 422);
    }

    const sessao = await sessaoRepository.buscarPorId(sessaoId);
    if (!sessao) throw new AppError("Sessão não encontrada", 404);
    if (sessao.dataHora.getTime() <= Date.now()) {
      throw new AppError("Esta sessão já ocorreu, não é possível reservar assentos", 422);
    }

    const assentos = await assentoRepository.buscarPorIds(idsUnicos);
    if (assentos.length !== idsUnicos.length || assentos.some((a) => a.salaId !== sessao.salaId)) {
      throw new AppError("Um ou mais assentos informados não pertencem a esta sessão", 422);
    }

    // Regra de negócio: toda reserva expira em `RESERVA_EXPIRACAO_MINUTOS`
    // minutos (padrão: 10) se o pagamento não for confirmado antes disso.
    // Quem decide o prazo é o service; o banco só aplica esse prazo já
    // calculado (ver trigger `trg_reserva_expira_antes_insert`, que libera o
    // assento de uma reserva vencida antes de aceitar uma nova).
    const expiraEm = new Date(Date.now() + env.reservaExpiracaoMinutos * 60_000);

    const reservas = await prisma.$transaction(async (tx) => {
      await reservaRepository.travarAssentosDaSessao(tx, sessaoId, idsUnicos);

      const conflitantes = await reservaRepository.buscarConflitantes(tx, sessaoId, idsUnicos);
      if (conflitantes.length > 0) {
        throw new AppError(
          "Um ou mais assentos selecionados acabaram de ser reservados por outro cliente",
          409,
        );
      }

      return reservaRepository.criarMuitas(
        tx,
        idsUnicos.map((assentoId) => ({ sessaoId, assentoId, usuarioId, expiraEm })),
      );
    });

    // O total é calculado aqui, não no app: a interface não deve expor um
    // totalizador que ela mesma multiplicou, já que esse valor é controlado
    // pela camada de negócio (preço da sessão × quantidade de assentos).
    const valorTotal = Number(sessao.preco) * idsUnicos.length;

    return { reservas, expiraEm, valorTotal };
  },
};
