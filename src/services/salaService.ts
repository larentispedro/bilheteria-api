import { assentoRepository } from "../repositories/assentoRepository.ts";
import { salaRepository } from "../repositories/salaRepository.ts";
import { AppError } from "../utils/AppError.ts";

export const salaService = {
  listar() {
    return salaRepository.listar();
  },

  async buscarPorId(id: number) {
    const sala = await salaRepository.buscarPorId(id);
    if (!sala) throw new AppError("Sala não encontrada", 404);
    return sala;
  },

  criar(dados: { nome: string }) {
    return salaRepository.criar(dados);
  },

  async atualizar(id: number, dados: { nome?: string }) {
    await salaService.buscarPorId(id);
    return salaRepository.atualizar(id, dados);
  },

  async remover(id: number) {
    await salaService.buscarPorId(id);
    return salaRepository.remover(id);
  },

  /**
   * Gera o conjunto fixo de assentos de uma sala (fileiras x numeração).
   * Só pode ser feito uma vez: a sala não pode já ter assentos cadastrados.
   */
  async gerarAssentos(salaId: number, filas: string[], assentosPorFila: number) {
    const sala = await salaService.buscarPorId(salaId);
    if (sala.assentos.length > 0) {
      throw new AppError("Esta sala já possui assentos cadastrados", 409);
    }
    if (filas.length === 0 || assentosPorFila <= 0) {
      throw new AppError("Informe ao menos uma fileira e uma quantidade de assentos por fileira", 422);
    }

    const assentos = filas.flatMap((fila) =>
      Array.from({ length: assentosPorFila }, (_, i) => ({ fila, numero: i + 1 })),
    );

    await assentoRepository.criarMuitos(salaId, assentos);
    return assentoRepository.listarPorSala(salaId);
  },
};
