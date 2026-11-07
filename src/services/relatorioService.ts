import { relatorioRepository } from "../repositories/relatorioRepository.ts";
import { StatusReserva } from "../generated/prisma/enums.ts";

export const relatorioService = {
  /** Relatório gerencial de vendas: totais e detalhamento por venda/sessão. */
  async vendas() {
    const vendas = await relatorioRepository.vendas();

    const resumoPorSessao = new Map<
      number,
      { sessaoId: number; evento: string; dataHora: Date; ingressosVendidos: number; valorArrecadado: number }
    >();

    for (const venda of vendas) {
      for (const ingresso of venda.ingressos) {
        const sessao = ingresso.reserva.sessao;
        const atual = resumoPorSessao.get(sessao.id) ?? {
          sessaoId: sessao.id,
          evento: sessao.evento.titulo,
          dataHora: sessao.dataHora,
          ingressosVendidos: 0,
          valorArrecadado: 0,
        };
        atual.ingressosVendidos += 1;
        atual.valorArrecadado += Number(sessao.preco);
        resumoPorSessao.set(sessao.id, atual);
      }
    }

    return {
      totalVendas: vendas.length,
      totalIngressos: vendas.reduce((soma, v) => soma + v.ingressos.length, 0),
      valorTotalArrecadado: vendas.reduce((soma, v) => soma + Number(v.valorTotal), 0),
      porSessao: [...resumoPorSessao.values()],
      vendas: vendas.map((v) => ({
        id: v.id,
        criadaEm: v.criadaEm,
        usuario: v.usuario,
        valorTotal: Number(v.valorTotal),
        ingressos: v.ingressos.map((i) => ({
          codigoUnico: i.codigoUnico,
          assento: `${i.reserva.assento.fila}${i.reserva.assento.numero}`,
          evento: i.reserva.sessao.evento.titulo,
          dataHora: i.reserva.sessao.dataHora,
        })),
      })),
    };
  },

  /** Relatório gerencial de taxa de ocupação por sessão. */
  async ocupacao(sessaoId?: number) {
    const sessoes = await relatorioRepository.ocupacao(sessaoId);

    return sessoes.map((sessao) => {
      const totalAssentos = sessao.sala.assentos.length;
      const vendidos = sessao.reservas.filter((r) => r.status === StatusReserva.PAGO).length;
      const reservados = sessao.reservas.filter((r) => r.status === StatusReserva.RESERVADO).length;
      const ocupados = vendidos + reservados;

      return {
        sessaoId: sessao.id,
        evento: sessao.evento.titulo,
        sala: sessao.sala.nome,
        dataHora: sessao.dataHora,
        totalAssentos,
        vendidos,
        reservados,
        livres: totalAssentos - ocupados,
        taxaOcupacao: totalAssentos > 0 ? ocupados / totalAssentos : 0,
      };
    });
  },

  /** Relatório gerencial em SQL puro: uma linha por ingresso vendido. */
  async vendasDetalhadas() {
    const linhas = await relatorioRepository.vendasDetalhadas();
    return linhas.map((l) => ({ ...l, preco: Number(l.preco) }));
  },
};
