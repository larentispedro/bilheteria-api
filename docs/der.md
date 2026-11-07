# Diagrama Entidade-Relacionamento

Modelo lógico implementado em `backend/prisma/schema.prisma` e materializado na migration
`backend/prisma/migrations/20261103000000_init/migration.sql`.

```mermaid
erDiagram
    USUARIO ||--o{ RESERVA : faz
    USUARIO ||--o{ VENDA : realiza
    EVENTO ||--o{ SESSAO : tem
    SALA ||--o{ SESSAO : abriga
    SALA ||--o{ ASSENTO : possui
    SESSAO ||--o{ RESERVA : recebe
    ASSENTO ||--o{ RESERVA : "e alvo de"
    RESERVA ||--o| INGRESSO : gera
    VENDA ||--o{ INGRESSO : agrupa

    USUARIO {
        int id PK
        string nome
        string email UK
        string senhaHash
        string papel "CLIENTE ou OPERADOR"
        datetime criadoEm
    }

    EVENTO {
        int id PK
        string titulo
        string descricao
        int duracaoMinutos
        datetime criadoEm
    }

    SALA {
        int id PK
        string nome
        datetime criadoEm
    }

    ASSENTO {
        int id PK
        int salaId FK
        string fila
        int numero
    }

    SESSAO {
        int id PK
        int eventoId FK
        int salaId FK
        datetime dataHora
        decimal preco
        datetime criadoEm
    }

    RESERVA {
        int id PK
        int sessaoId FK
        int assentoId FK
        int usuarioId FK
        string status "RESERVADO, PAGO, EXPIRADA ou CANCELADA"
        datetime expiraEm
        datetime criadaEm
    }

    VENDA {
        int id PK
        int usuarioId FK
        decimal valorTotal
        datetime criadaEm
    }

    INGRESSO {
        int id PK
        int reservaId FK, UK
        int vendaId FK
        string codigoUnico UK
        string status "VALIDO ou UTILIZADO"
        datetime emitidoEm
        datetime utilizadoEm
    }
```

## Constraints e índices relevantes

- `ASSENTO`: `UNIQUE (salaId, fila, numero)` — não existem dois assentos iguais na mesma sala.
- `USUARIO.email`, `INGRESSO.codigoUnico`: `UNIQUE`.
- `INGRESSO.reservaId`: `UNIQUE` (relação 1:1 com `RESERVA`).
- **Regra central do negócio** — "um assento de uma sessão só pode ser vendido a um
  cliente": índice único **parcial**
  `UNIQUE (sessaoId, assentoId) WHERE status IN ('RESERVADO','PAGO')` em `RESERVA`. Reservas
  `EXPIRADA`/`CANCELADA` não contam, liberando o assento para nova reserva.
- Índices de apoio: `SESSAO(dataHora)`, `RESERVA(status, expiraEm)`, `RESERVA(sessaoId, assentoId)`.
- Trigger `trg_reserva_expira_antes_insert` expira reservas vencidas antes de cada novo INSERT
  em `RESERVA`.
- Stored procedure `confirmar_pagamento` cria a `VENDA` e os `INGRESSO` atomicamente a partir de
  uma ou mais `RESERVA`.
