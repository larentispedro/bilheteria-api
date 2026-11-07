-- =========================================================================
-- Troca a FUNCTION confirmar_pagamento por uma PROCEDURE de verdade — o
-- enunciado pede uma "stored procedure", e o Postgres tem CREATE PROCEDURE
-- desde a versão 11. Mesmo corpo e mesmas validações da function anterior;
-- como procedure não tem RETURN de valor, o id da venda agora sai pelo
-- parâmetro INOUT `p_venda_id` (entra NULL, volta preenchido).
-- =========================================================================
DROP FUNCTION IF EXISTS confirmar_pagamento(INTEGER[], INTEGER, TEXT[]);

CREATE OR REPLACE PROCEDURE confirmar_pagamento(
    p_reserva_ids INTEGER[],
    p_usuario_id INTEGER,
    p_codigos TEXT[],
    INOUT p_venda_id INTEGER DEFAULT NULL
) AS $$
DECLARE
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
    RETURNING "id" INTO p_venda_id;

    UPDATE "reservas"
       SET "status" = 'PAGO'
     WHERE "id" = ANY(p_reserva_ids);

    FOR i IN 1..v_count_informadas LOOP
        v_reserva_id := p_reserva_ids[i];
        INSERT INTO "ingressos" ("reservaId", "vendaId", "codigoUnico", "status", "emitidoEm")
        VALUES (v_reserva_id, p_venda_id, p_codigos[i], 'VALIDO', now());
    END LOOP;
END;
$$ LANGUAGE plpgsql;
