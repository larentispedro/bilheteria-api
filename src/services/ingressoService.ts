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

  /**
   * Validação na entrada: marca o ingresso como utilizado.
   *
   * Regra de negócio: um ingresso só pode ser validado uma vez. A escrita no
   * banco é condicionada ao status atual (`UPDATE ... WHERE status = 'VALIDO'`)
   * e acontece atomicamente — isso evita que dois atendentes validando o
   * mesmo ingresso ao mesmo tempo (ex.: duas catracas) os dois passem pela
   * checagem antes de qualquer um escrever.
   */
  async validar(codigoUnico: string) {
    const ingresso = await ingressoService.buscarPorCodigo(codigoUnico);

    const resultado = await ingressoRepository.marcarUtilizado(ingresso.id);
    if (resultado.count === 0) {
      throw new AppError("Este ingresso já foi utilizado", 409);
    }

    return { ...ingresso, status: StatusIngresso.UTILIZADO, utilizadoEm: new Date() };
  },
};
