import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.ts";
import { ingressoRepository } from "../repositories/ingressoRepository.ts";
import { reservaRepository } from "../repositories/reservaRepository.ts";
import { AppError } from "../utils/AppError.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

export const pagamentoService = {
  /**
   * Confirma o pagamento (simulado) de uma ou mais reservas do usuário,
   * emitindo um ingresso com código único para cada uma.
   *
   * Regra de negócio (dona desta regra: este service): só é possível pagar
   * reservas que existam, pertençam ao usuário autenticado, estejam com
   * status RESERVADO e não tenham expirado. Essa checagem é feita aqui,
   * abaixo, e é o service que decide qual erro (404/403/409) devolver ao
   * cliente da API. A stored procedure `confirmar_pagamento`, chamada na
   * sequência, repete a mesma validação dentro de uma transação com lock de
   * linha — isso é necessário para a atomicidade: entre a checagem feita
   * aqui e a escrita no banco, uma segunda requisição concorrente poderia
   * pagar a mesma reserva duas vezes, e só o banco consegue impedir isso.
   */
  async confirmarPagamento(usuarioId: number, reservaIds: number[]) {
    const idsUnicos = [...new Set(reservaIds)];
    if (idsUnicos.length === 0) {
      throw new AppError("Selecione ao menos uma reserva para pagar", 422);
    }

    const reservas = await reservaRepository.buscarPorIds(idsUnicos);

    if (reservas.length !== idsUnicos.length) {
      throw new AppError("Uma ou mais reservas não foram encontradas", 404);
    }
    if (reservas.some((r) => r.usuarioId !== usuarioId)) {
      throw new AppError("Uma ou mais reservas não pertencem a você", 403);
    }
    if (reservas.some((r) => r.status !== StatusReserva.RESERVADO)) {
      throw new AppError("Uma ou mais reservas já foram pagas ou canceladas", 409);
    }
    const agora = Date.now();
    if (reservas.some((r) => r.expiraEm.getTime() < agora)) {
      throw new AppError("Uma ou mais reservas expiraram", 409);
    }

    const codigos = idsUnicos.map(() => randomUUID());

    let vendaId: number;
    try {
      // CALL (não SELECT): `confirmar_pagamento` é uma PROCEDURE, não uma
      // function — ela devolve o id da venda pelo parâmetro INOUT
      // `p_venda_id`, que a extensão simples do protocolo do Postgres traz
      // como a única coluna da linha de resultado.
      const resultado = await prisma.$queryRaw<Array<{ p_venda_id: number }>>`
        CALL confirmar_pagamento(${idsUnicos}::int[], ${usuarioId}::int, ${codigos}::text[], NULL)
      `;
      vendaId = resultado[0]!.p_venda_id;
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

    // Mesma regra: o total pago vem do valor que a procedure já gravou na
    // venda (soma dos preços das sessões das reservas), não de uma conta
    // refeita no app.
    const venda = await prisma.venda.findUniqueOrThrow({
      where: { id: vendaId },
      select: { valorTotal: true },
    });

    return { vendaId, ingressos, valorTotal: Number(venda.valorTotal) };
  },
};
