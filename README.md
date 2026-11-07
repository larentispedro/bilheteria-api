# Backend - Bilheteria de Cinema

API REST em TypeScript/Node.js/Express, com Prisma ORM e PostgreSQL. Organizada em camadas:
`controllers` (HTTP + validação) → `services` (regras de negócio) → `repositories` (acesso ao banco via Prisma).

## Requisitos

- Node.js 20+
- PostgreSQL 14+ em execução

## Configuração

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` com usuário/senha do seu Postgres local:

   ```
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/bilheteria?schema=public"
   JWT_SECRET="um-segredo-qualquer"
   ```

2. Instale as dependências (já feito neste repositório, mas se precisar):

   ```
   npm install
   ```

3. Crie o banco `bilheteria` (se ainda não existir) e rode as migrations, que também criam a
   trigger e a stored procedure usadas pelas regras de negócio:

   ```
   npx prisma migrate dev
   ```

   Na primeira execução, o Prisma aplicará a migration já versionada em
   `prisma/migrations/20261103000000_init/migration.sql`.

4. Popule dados mínimos de demonstração (1 operador, 1 cliente, 1 filme, 1 sala com assentos e 1 sessão):

   ```
   npm run seed
   ```

   Usuários criados: `operador@cinema.com` / `123456` e `cliente@teste.com` / `123456`.

5. Suba a API:

   ```
   npm run dev
   ```

   Por padrão em `http://localhost:3000`.

## Regras de negócio implementadas

- Um assento de uma sessão só pode estar em **uma** reserva ativa (RESERVADO ou PAGO) por vez —
  garantido por um **índice único parcial** no banco e reforçado por **advisory lock** +
  verificação de conflito dentro de uma transação Prisma (`reservaService.criarReservas`).
- Reservas expiram automaticamente: cada reserva tem `expiraEm`; uma **trigger**
  (`trg_reserva_expira_antes_insert`) marca reservas vencidas como `EXPIRADA` antes de aceitar
  uma nova reserva para o mesmo assento/sessão, liberando o assento.
- O pagamento (simulado) de uma ou mais reservas é confirmado por uma **stored procedure**
  (`confirmar_pagamento`), que trava as linhas envolvidas, valida posse/expiração, cria a venda
  e emite os ingressos com código único — tudo atomicamente.
- Ingresso só pode ser validado (marcado como utilizado) uma vez.

### Onde está cada regra de negócio

Toda regra abaixo é decidida e validada na camada de **service** (com tipagem TypeScript),
que é quem devolve o erro correto (404/403/409/422) ao controller. O banco (índice único,
trigger e stored procedure) existe só como proteção extra contra concorrência — não é onde a
regra "mora".

| Regra | Arquivo / função |
| --- | --- |
| Um assento não pode ser reservado/vendido duas vezes na mesma sessão | `src/services/reservaService.ts` → `criarReservas` |
| Reserva expira em `RESERVA_EXPIRACAO_MINUTOS` minutos | `src/services/reservaService.ts` → `criarReservas` |
| Pagamento só de reservas existentes, do próprio usuário, com status RESERVADO e não expiradas | `src/services/pagamentoService.ts` → `confirmarPagamento` |
| Sessão só pode ser criada/alterada para evento e sala existentes, com sala já com assentos | `src/services/sessaoService.ts` → `validarEventoESala` |
| Preço e data/hora da sessão devem ser válidos (preço > 0, data no futuro) | `src/services/sessaoService.ts` → `criar` / `atualizar` |
| Ingresso só pode ser validado (marcado como utilizado) uma vez | `src/services/ingressoService.ts` → `validar` |

## Principais endpoints

Ver `../docs/api.md` na raiz do trabalho para a lista completa.

## Deploy em produção

O enunciado exige o backend rodando em produção (nuvem) com PostgreSQL gerenciado. Passos gerais
para qualquer provedor (Render, Railway, Azure App Service, AWS, etc.):

1. Provisione um banco PostgreSQL gerenciado e obtenha a `DATABASE_URL` de produção.
2. Configure as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV=production`)
   no provedor escolhido.
3. Rode as migrations contra o banco de produção: `npx prisma migrate deploy`.
4. Popule só o operador padrão (sem dados de demonstração): com `NODE_ENV=production` já
   configurado, `npm run seed` detecta o ambiente e pula filme/sala/sessão de exemplo — cria
   só `operador@cinema.com` / `123456` (mesmas credenciais da seção "Configuração" acima).
   Fora de produção, force o mesmo comportamento com `SEED_APENAS_OPERADOR=true npm run seed`.
5. Inicie a aplicação com `npm start` (usa `tsx` para rodar o TypeScript diretamente).
6. No frontend, configure `EXPO_PUBLIC_API_URL` com a URL pública desta API antes do build
   (ver `../frontend/README.md`).

Este repositório ainda não foi publicado em nenhum provedor — isso depende de credenciais de
conta que só o responsável pelo trabalho possui.
