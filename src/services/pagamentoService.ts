import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.ts";
import { ingressoRepository } from "../repositories/ingressoRepository.ts";
import { AppError } from "../utils/AppError.ts";

export const pagamentoService = {
  /**
   * Confirma o pagamento (simulado) de uma ou mais reservas do usuário,
   * emitindo um ingresso com código único para cada uma. Toda a validação
   * (posse, status RESERVADO, não expirado) e a emissão dos ingressos
   * acontecem atomicamente na stored procedure `confirmar_pagamento`.
   */
  async confirmarPagamento(usuarioId: number, reservaIds: number[]) {
    const idsUnicos = [...new Set(reservaIds)];
    if (idsUnicos.length === 0) {
      throw new AppError("Selecione ao menos uma reserva para pagar", 422);
    }

    const codigos = idsUnicos.map(() => randomUUID());

    let vendaId: number;
    try {
      const resultado = await prisma.$queryRaw<Array<{ confirmar_pagamento: number }>>`
        SELECT confirmar_pagamento(${idsUnicos}::int[], ${usuarioId}::int, ${codigos}::text[])
      `;
      vendaId = resultado[0]!.confirmar_pagamento;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "";
      if (mensagem.includes("invalidas") || mensagem.includes("expiraram")) {
        throw new AppError(
          "Uma ou mais reservas são inválidas, expiraram ou não pertencem a você",
          409,
        );
      }
      throw new AppError("Não foi possível confirmar o pagamento", 422);
    }

    const ingressos = await ingressoRepository.listarPorVenda(vendaId);

    return { vendaId, ingressos };
  },
};
