-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CLIENTE', 'OPERADOR');
CREATE TYPE "StatusReserva" AS ENUM ('RESERVADO', 'PAGO', 'EXPIRADA', 'CANCELADA');
CREATE TYPE "StatusIngresso" AS ENUM ('VALIDO', 'UTILIZADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'CLIENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "duracaoMinutos" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "salas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assentos" (
    "id" SERIAL NOT NULL,
    "salaId" INTEGER NOT NULL,
    "fila" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    CONSTRAINT "assentos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessoes" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "salaId" INTEGER NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "sessaoId" INTEGER NOT NULL,
    "assentoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "StatusReserva" NOT NULL DEFAULT 'RESERVADO',
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingressos" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "codigoUnico" TEXT NOT NULL,
    "status" "StatusIngresso" NOT NULL DEFAULT 'VALIDO',
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizadoEm" TIMESTAMP(3),
    CONSTRAINT "ingressos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unicidade)
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "assentos_salaId_fila_numero_key" ON "assentos"("salaId", "fila", "numero");
CREATE UNIQUE INDEX "ingressos_reservaId_key" ON "ingressos"("reservaId");
CREATE UNIQUE INDEX "ingressos_codigoUnico_key" ON "ingressos"("codigoUnico");

-- CreateIndex (consulta)
CREATE INDEX "sessoes_dataHora_idx" ON "sessoes"("dataHora");
CREATE INDEX "reservas_status_expiraEm_idx" ON "reservas"("status", "expiraEm");
CREATE INDEX "reservas_sessaoId_assentoId_idx" ON "reservas"("sessaoId", "assentoId");

-- Regra de negócio central: um assento só pode estar em UMA reserva ativa
-- (RESERVADO ou PAGO) por sessão. Índice único PARCIAL, pois reservas
-- EXPIRADA/CANCELADA não devem contar para a unicidade.
CREATE UNIQUE INDEX "reservas_assento_ativo_key"
    ON "reservas" ("sessaoId", "assentoId")
    WHERE "status" IN ('RESERVADO', 'PAGO');

-- AddForeignKey
ALTER TABLE "assentos" ADD CONSTRAINT "assentos_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_assentoId_fkey" FOREIGN KEY ("assentoId") REFERENCES "assentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendas" ADD CONSTRAINT "vendas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingressos" ADD CONSTRAINT "ingressos_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingressos" ADD CONSTRAINT "ingressos_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- TRIGGER: expira automaticamente uma reserva vencida do mesmo assento/sessão
-- antes de permitir uma nova reserva (evita bloqueio falso pelo índice único
-- parcial acima e implementa "reserva temporária com expiração" no banco).
-- =========================================================================
CREATE OR REPLACE FUNCTION trg_fn_expirar_reserva_conflitante()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "reservas"
       SET "status" = 'EXPIRADA'
     WHERE "sessaoId" = NEW."sessaoId"
       AND "assentoId" = NEW."assentoId"
       AND "status" = 'RESERVADO'
       AND "expiraEm" < now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_expira_antes_insert
    BEFORE INSERT ON "reservas"
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_expirar_reserva_conflitante();

-- =========================================================================
-- STORED PROCEDURE: confirma o pagamento de uma ou mais reservas em uma
-- única transação atômica. Trava as linhas (FOR UPDATE) para tratar a
-- concorrência, valida posse/expiração, cria a venda e emite os ingressos.
-- =========================================================================
CREATE OR REPLACE FUNCTION confirmar_pagamento(
    p_reserva_ids INTEGER[],
    p_usuario_id INTEGER,
    p_codigos TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    v_venda_id INTEGER;
    v_valor_total DECIMAL(10,2);
    v_count_validas INTEGER;
    v_count_informadas INTEGER;
    v_reserva_id INTEGER;
    i INTEGER;
BEGIN
    v_count_informadas := array_length(p_reserva_ids, 1);

    IF v_count_informadas IS NULL OR v_count_informadas = 0 THEN
        RAISE EXCEPTION 'Nenhuma reserva informada';
    END IF;

    IF array_length(p_codigos, 1) IS DISTINCT FROM v_count_informadas THEN
        RAISE EXCEPTION 'Quantidade de codigos nao confere com a quantidade de reservas';
    END IF;

    -- Trava as linhas das reservas envolvidas para evitar corrida entre
    -- dois pagamentos concorrentes sobre a mesma reserva.
    PERFORM r."id"
      FROM "reservas" r
     WHERE r."id" = ANY(p_reserva_ids)
     FOR UPDATE;

    SELECT count(*)
      INTO v_count_validas
      FROM "reservas" r
     WHERE r."id" = ANY(p_reserva_ids)
       AND r."usuarioId" = p_usuario_id
       AND r."status" = 'RESERVADO'
       AND r."expiraEm" >= now();

    IF v_count_validas <> v_count_informadas THEN
        RAISE EXCEPTION 'Uma ou mais reservas sao invalidas, expiraram ou nao pertencem ao usuario';
    END IF;

    SELECT coalesce(sum(s."preco"), 0)
      INTO v_valor_total
      FROM "reservas" r
      JOIN "sessoes" s ON s."id" = r."sessaoId"
     WHERE r."id" = ANY(p_reserva_ids);

    INSERT INTO "vendas" ("usuarioId", "valorTotal", "criadaEm")
    VALUES (p_usuario_id, v_valor_total, now())
    RETURNING "id" INTO v_venda_id;

    UPDATE "reservas"
       SET "status" = 'PAGO'
     WHERE "id" = ANY(p_reserva_ids);

    FOR i IN 1..v_count_informadas LOOP
        v_reserva_id := p_reserva_ids[i];
        INSERT INTO "ingressos" ("reservaId", "vendaId", "codigoUnico", "status", "emitidoEm")
        VALUES (v_reserva_id, v_venda_id, p_codigos[i], 'VALIDO', now());
    END LOOP;

    RETURN v_venda_id;
END;
$$ LANGUAGE plpgsql;
