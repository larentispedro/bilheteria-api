import PDFDocument from "pdfkit";
import type { relatorioService } from "./relatorioService.ts";

type RelatorioVendas = Awaited<ReturnType<typeof relatorioService.vendas>>;
type RelatorioOcupacao = Awaited<ReturnType<typeof relatorioService.ocupacao>>;

const CORES = {
  tinta: "#17182b",
  tintaSuave: "#9499c2",
  primaria: "#4f46e5",
  primariaClara: "#eef2ff",
  texto: "#17182b",
  textoSecundario: "#6b7280",
  borda: "#e4e4ec",
  linhaAlternada: "#f7f7fb",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: Date) {
  return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function novoDocumento() {
  return new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
}

function cabecalho(doc: PDFKit.PDFDocument, titulo: string) {
  doc.rect(0, 0, doc.page.width, 90).fill(CORES.tinta);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("Bilheteria", 50, 26);
  doc.fillColor(CORES.tintaSuave).font("Helvetica").fontSize(12).text(titulo, 50, 52);
  doc.fontSize(9).text(`Gerado em ${formatarData(new Date())}`, 50, 70);

  doc.fillColor(CORES.texto).font("Helvetica");
  doc.x = 50;
  doc.y = 112;
}

function tituloSecao(doc: PDFKit.PDFDocument, texto: string) {
  doc.fillColor(CORES.texto).font("Helvetica-Bold").fontSize(12).text(texto, 50, doc.y);
  doc.moveDown(0.6);
  doc.font("Helvetica");
}

function textoVazio(doc: PDFKit.PDFDocument, texto: string) {
  doc.fillColor(CORES.textoSecundario).font("Helvetica").fontSize(9).text(texto, 50, doc.y);
  doc.moveDown(1.2);
}

function caixasResumo(doc: PDFKit.PDFDocument, itens: { rotulo: string; valor: string }[]) {
  const margem = doc.page.margins.left;
  const larguraUtil = doc.page.width - margem - doc.page.margins.right;
  const gap = 12;
  const largura = (larguraUtil - gap * (itens.length - 1)) / itens.length;
  const altura = 56;
  const y = doc.y;

  itens.forEach((item, i) => {
    const x = margem + i * (largura + gap);
    doc.roundedRect(x, y, largura, altura, 6).fillAndStroke(CORES.primariaClara, CORES.borda);
    doc
      .fillColor(CORES.textoSecundario)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(item.rotulo, x + 12, y + 11, { width: largura - 24 });
    doc
      .fillColor(CORES.primaria)
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(item.valor, x + 12, y + 26, { width: largura - 24 });
  });

  doc.fillColor(CORES.texto).font("Helvetica");
  doc.x = margem;
  doc.y = y + altura + 24;
}

type Coluna = { titulo: string; largura: number; alinhar?: "left" | "right" | "center" };

/** Desenha uma tabela com cabeçalho colorido, zebra nas linhas e quebra automática de página. */
function tabela(doc: PDFKit.PDFDocument, colunas: Coluna[], linhas: string[][]) {
  const margemEsquerda = doc.page.margins.left;
  const margemInferior = doc.page.margins.bottom;
  const larguraTabela = colunas.reduce((soma, c) => soma + c.largura, 0);
  const alturaCabecalho = 22;
  const padding = 6;

  function cabecalhoTabela() {
    const y = doc.y;
    doc.rect(margemEsquerda, y, larguraTabela, alturaCabecalho).fill(CORES.primaria);
    let x = margemEsquerda;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    for (const coluna of colunas) {
      doc.text(coluna.titulo, x + padding, y + 7, {
        width: coluna.largura - padding * 2,
        align: coluna.alinhar ?? "left",
      });
      x += coluna.largura;
    }
    doc.y = y + alturaCabecalho;
    doc.font("Helvetica").fillColor(CORES.texto);
  }

  cabecalhoTabela();

  linhas.forEach((linha, indice) => {
    doc.fontSize(8.5);
    let alturaLinha = 0;
    linha.forEach((valor, i) => {
      alturaLinha = Math.max(
        alturaLinha,
        doc.heightOfString(valor || "-", { width: colunas[i].largura - padding * 2 }),
      );
    });
    alturaLinha += padding * 2;

    if (doc.y + alturaLinha > doc.page.height - margemInferior) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      cabecalhoTabela();
    }

    const y = doc.y;
    if (indice % 2 === 1) {
      doc.rect(margemEsquerda, y, larguraTabela, alturaLinha).fill(CORES.linhaAlternada);
    }

    let x = margemEsquerda;
    linha.forEach((valor, i) => {
      doc.fillColor(CORES.texto).text(valor || "-", x + padding, y + padding, {
        width: colunas[i].largura - padding * 2,
        align: colunas[i].alinhar ?? "left",
      });
      x += colunas[i].largura;
    });

    doc.y = y + alturaLinha;
  });

  doc
    .moveTo(margemEsquerda, doc.y)
    .lineTo(margemEsquerda + larguraTabela, doc.y)
    .strokeColor(CORES.borda)
    .lineWidth(1)
    .stroke();

  doc.x = margemEsquerda;
  doc.y += 18;
}

function rodape(doc: PDFKit.PDFDocument) {
  const paginas = doc.bufferedPageRange();
  for (let i = paginas.start; i < paginas.start + paginas.count; i++) {
    doc.switchToPage(i);
    // Escrever dentro da margem inferior dispararia uma quebra de página
    // automática do pdfkit (o cursor ultrapassaria page.maxY()); zera a
    // margem só durante esse texto pra evitar a página extra em branco.
    const margemOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .fontSize(8)
      .fillColor(CORES.textoSecundario)
      .text(`Página ${i + 1} de ${paginas.count}`, doc.page.margins.left, doc.page.height - 35, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: "center",
      });
    doc.page.margins.bottom = margemOriginal;
  }
}

export const relatorioPdfService = {
  vendas(dados: RelatorioVendas) {
    const doc = novoDocumento();
    cabecalho(doc, "Relatório de vendas");

    caixasResumo(doc, [
      { rotulo: "TOTAL DE VENDAS", valor: String(dados.totalVendas) },
      { rotulo: "INGRESSOS EMITIDOS", valor: String(dados.totalIngressos) },
      { rotulo: "VALOR ARRECADADO", valor: formatarMoeda(dados.valorTotalArrecadado) },
    ]);

    tituloSecao(doc, "Vendas por sessão");
    if (dados.porSessao.length === 0) {
      textoVazio(doc, "Nenhuma venda registrada.");
    } else {
      tabela(
        doc,
        [
          { titulo: "EVENTO", largura: 180 },
          { titulo: "DATA/HORA", largura: 110 },
          { titulo: "INGRESSOS", largura: 70, alinhar: "right" },
          { titulo: "VALOR ARRECADADO", largura: 110, alinhar: "right" },
        ],
        dados.porSessao.map((s) => [
          s.evento,
          formatarData(s.dataHora),
          String(s.ingressosVendidos),
          formatarMoeda(s.valorArrecadado),
        ]),
      );
    }

    tituloSecao(doc, "Ingressos emitidos");
    if (dados.vendas.length === 0) {
      textoVazio(doc, "Nenhum ingresso emitido.");
    } else {
      const linhas = dados.vendas.flatMap((v) =>
        v.ingressos.map((i) => [
          `#${v.id}`,
          v.usuario.nome,
          i.evento,
          i.assento,
          i.codigoUnico.slice(0, 8),
          formatarData(i.dataHora),
        ]),
      );
      tabela(
        doc,
        [
          { titulo: "VENDA", largura: 40 },
          { titulo: "CLIENTE", largura: 95 },
          { titulo: "EVENTO", largura: 90 },
          { titulo: "ASSENTO", largura: 55, alinhar: "center" },
          { titulo: "CÓDIGO", largura: 65 },
          { titulo: "SESSÃO", largura: 115 },
        ],
        linhas,
      );
    }

    rodape(doc);
    return doc;
  },

  ocupacao(dados: RelatorioOcupacao) {
    const doc = novoDocumento();
    cabecalho(doc, "Relatório de ocupação por sessão");

    tituloSecao(doc, `${dados.length} sessão(ões)`);
    if (dados.length === 0) {
      textoVazio(doc, "Nenhuma sessão cadastrada.");
    } else {
      tabela(
        doc,
        [
          { titulo: "EVENTO", largura: 105 },
          { titulo: "SALA", largura: 65 },
          { titulo: "DATA/HORA", largura: 90 },
          { titulo: "VENDIDOS", largura: 55, alinhar: "right" },
          { titulo: "RESERV.", largura: 50, alinhar: "right" },
          { titulo: "LIVRES", largura: 48, alinhar: "right" },
          { titulo: "OCUPAÇÃO", largura: 60, alinhar: "right" },
        ],
        dados.map((o) => [
          o.evento,
          o.sala,
          formatarData(o.dataHora),
          String(o.vendidos),
          String(o.reservados),
          String(o.livres),
          `${(o.taxaOcupacao * 100).toFixed(0)}%`,
        ]),
      );
    }

    rodape(doc);
    return doc;
  },
};
