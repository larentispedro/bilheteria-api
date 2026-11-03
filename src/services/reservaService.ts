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

    return { reservas, expiraEm };
  },
};
