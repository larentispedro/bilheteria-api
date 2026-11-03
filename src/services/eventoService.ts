import { eventoRepository } from "../repositories/eventoRepository.ts";
import { AppError } from "../utils/AppError.ts";

export const eventoService = {
  listar() {
    return eventoRepository.listar();
  },

  async buscarPorId(id: number) {
    const evento = await eventoRepository.buscarPorId(id);
    if (!evento) throw new AppError("Filme/evento não encontrado", 404);
    return evento;
  },

  criar(dados: { titulo: string; descricao?: string; duracaoMinutos: number }) {
    if (dados.duracaoMinutos <= 0) {
      throw new AppError("Duração deve ser maior que zero", 422);
    }
    return eventoRepository.criar(dados);
  },

  async atualizar(
    id: number,
    dados: { titulo?: string; descricao?: string; duracaoMinutos?: number },
  ) {
    await eventoService.buscarPorId(id);
    if (dados.duracaoMinutos !== undefined && dados.duracaoMinutos <= 0) {
      throw new AppError("Duração deve ser maior que zero", 422);
    }
    return eventoRepository.atualizar(id, dados);
  },

  async remover(id: number) {
    await eventoService.buscarPorId(id);
    return eventoRepository.remover(id);
  },
};
