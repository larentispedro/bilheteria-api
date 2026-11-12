import { eventoRepository } from "../repositories/eventoRepository.ts";
import { reservaRepository } from "../repositories/reservaRepository.ts";
import { salaRepository } from "../repositories/salaRepository.ts";
import { sessaoRepository } from "../repositories/sessaoRepository.ts";
import { AppError } from "../utils/AppError.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

async function validarEventoESala(eventoId: number, salaId: number) {
  const [evento, sala] = await Promise.all([
    eventoRepository.buscarPorId(eventoId),
    salaRepository.buscarPorId(salaId),
  ]);
  if (!evento) throw new AppError("Filme/evento não encontrado", 404);
  if (!sala) throw new AppError("Sala não encontrada", 404);
  if (sala.assentos.length === 0) {
    throw new AppError("A sala escolhida ainda não possui assentos cadastrados", 422);
  }
}

export const sessaoService = {
  async listar() {
    const sessoes = await sessaoRepository.listar();
    // Regra de negócio: só o service decide se uma sessão ainda é vendável
    // (a interface não deve inferir isso sozinha comparando datas).
    return sessoes.map((sessao) => ({
      ...sessao,
      encerrada: sessao.dataHora.getTime() <= Date.now(),
    }));
  },

  async buscarPorId(id: number) {
    const sessao = await sessaoRepository.buscarPorId(id);
    if (!sessao) throw new AppError("Sessão não encontrada", 404);
    return sessao;
  },

  async criar(dados: { eventoId: number; salaId: number; dataHora: Date; preco: number }) {
    if (dados.preco <= 0) throw new AppError("Preço deve ser maior que zero", 422);
    if (dados.dataHora.getTime() <= Date.now()) {
      throw new AppError("A data/hora da sessão deve ser no futuro", 422);
    }
    await validarEventoESala(dados.eventoId, dados.salaId);
    return sessaoRepository.criar(dados);
  },

  async atualizar(
    id: number,
    dados: Partial<{ eventoId: number; salaId: number; dataHora: Date; preco: number }>,
  ) {
    const sessao = await sessaoService.buscarPorId(id);
    if (dados.preco !== undefined && dados.preco <= 0) {
      throw new AppError("Preço deve ser maior que zero", 422);
    }
    await validarEventoESala(dados.eventoId ?? sessao.eventoId, dados.salaId ?? sessao.salaId);
    return sessaoRepository.atualizar(id, dados);
  },

  async remover(id: number) {
    await sessaoService.buscarPorId(id);
    return sessaoRepository.remover(id);
  },

  /** Mapa de assentos da sessão: cada assento da sala com status livre/reservado/vendido. */
  async mapaDeAssentos(sessaoId: number) {
    const sessao = await sessaoService.buscarPorId(sessaoId);
    const reservasAtivas = await reservaRepository.listarAtivasPorSessao(sessaoId);

    const statusPorAssento = new Map(
      reservasAtivas.map((r) => [
        r.assentoId,
        r.status === StatusReserva.PAGO ? "vendido" : "reservado",
      ]),
    );

    return sessao.sala.assentos
      .map((assento) => ({
        id: assento.id,
        fila: assento.fila,
        numero: assento.numero,
        status: statusPorAssento.get(assento.id) ?? "livre",
      }))
      .sort((a, b) => a.fila.localeCompare(b.fila) || a.numero - b.numero);
  },
};
