import { ingressoRepository } from "../repositories/ingressoRepository.ts";
import { AppError } from "../utils/AppError.ts";
import { StatusIngresso } from "../generated/prisma/enums.ts";

export const ingressoService = {
  meusIngressos(usuarioId: number) {
    return ingressoRepository.listarPorUsuario(usuarioId);
  },

  async buscarPorCodigo(codigoUnico: string) {
    const ingresso = await ingressoRepository.buscarPorCodigo(codigoUnico);
    if (!ingresso) throw new AppError("Ingresso não encontrado", 404);
    return ingresso;
  },

  /** Validação na entrada: marca o ingresso como utilizado (regra: só pode usar uma vez). */
  async validar(codigoUnico: string) {
    const ingresso = await ingressoService.buscarPorCodigo(codigoUnico);
    if (ingresso.status === StatusIngresso.UTILIZADO) {
      throw new AppError("Este ingresso já foi utilizado", 409);
    }
    return ingressoRepository.marcarUtilizado(ingresso.id);
  },
};
