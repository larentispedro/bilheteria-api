# Backend - Bilheteria de Cinema

API REST em TypeScript/Node.js/Express, com Prisma ORM e PostgreSQL. Organizada em camadas:
`controllers` (HTTP + validação) → `services` (regras de negócio) → `repositories` (acesso ao banco via Prisma).

Frontend (Expo/React Native): https://github.com/larentispedro/bilheteria-app

## Requisitos

- Node.js 20+
- PostgreSQL 14+ em execução

## Configuração

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` com usuário/senha do seu Postgres local:

   ```
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/bilheteria?schema=public"
   JWT_SECRET="um-segredo-qualquer"
   ```

2. Instale as dependências:

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
   Essas credenciais valem só para ambiente local — veja a seção "Produção" abaixo.

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

A regra é expressa e validada na camada de **service**, com tipagem TypeScript, que é quem
devolve o erro adequado ao controller (404/403/409/422). O banco garante a atomicidade e a
integridade sob concorrência, que a aplicação sozinha não consegue assegurar: duas requisições
simultâneas passariam pela mesma validação no service antes de qualquer uma gravar. As duas
camadas são complementares — uma explica a regra, a outra a torna inviolável.

| Regra | Arquivo / função |
| --- | --- |
| Um assento não pode ser reservado/vendido duas vezes na mesma sessão | `src/services/reservaService.ts` → `criarReservas` |
| Reserva expira em `RESERVA_EXPIRACAO_MINUTOS` minutos | `src/services/reservaService.ts` → `criarReservas` |
| Pagamento só de reservas existentes, do próprio usuário, com status RESERVADO e não expiradas | `src/services/pagamentoService.ts` → `confirmarPagamento` |
| Sessão só pode ser criada/alterada para evento e sala existentes, com sala já com assentos | `src/services/sessaoService.ts` → `validarEventoESala` |
| Preço e data/hora da sessão devem ser válidos (preço > 0, data no futuro) | `src/services/sessaoService.ts` → `criar` / `atualizar` |
| Sessão já ocorrida não é oferecida para venda | `src/services/sessaoService.ts` → `listar` |
| Ingresso só pode ser validado (marcado como utilizado) uma vez | `src/services/ingressoService.ts` → `validar` |

## Documentação

- [docs/der.md](docs/der.md) — diagrama entidade-relacionamento (DER)
- [docs/casos-de-uso.md](docs/casos-de-uso.md) — diagrama e descrição dos casos de uso
- [docs/api.md](docs/api.md) — definição completa dos endpoints da API

## Produção

Sistema em produção: **http://3.150.40.45**

Arquitetura: uma única instância EC2 na AWS. O Nginx escuta na porta 80, serve o build web do
frontend em `/` e repassa as requisições que chegam em `/api` para esta API (Express, porta
3000) — por isso as rotas do Express continuam sem o prefixo `/api` no código (`/sessoes`,
`/auth`, etc.), quem remove o prefixo é o Nginx. O banco é um PostgreSQL gerenciado no RDS,
na mesma conta AWS.

As credenciais do seed (`operador@cinema.com` / `123456`, seção "Configuração" acima) valem
só para desenvolvimento local. Em produção, com `NODE_ENV=production`, `npm run seed` detecta
o ambiente e cria apenas o usuário operador padrão, sem os dados de demonstração (cliente,
filme, sala, sessão de exemplo). A senha de produção desse operador foi trocada manualmente
depois do seed, direto no banco — ela não fica versionada em nenhum arquivo deste repositório.

Passos gerais de deploy (válidos para qualquer provedor cloud):

1. Provisione um banco PostgreSQL gerenciado e obtenha a `DATABASE_URL` de produção.
2. Configure as variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV=production`).
3. Rode as migrations contra o banco de produção: `npx prisma migrate deploy`.
4. Popule o operador padrão: `npm run seed` (com `NODE_ENV=production`, já pula os dados de
   demonstração — fora de produção, force o mesmo comportamento com
   `SEED_APENAS_OPERADOR=true npm run seed`).
5. Inicie a aplicação com `npm start` (usa `tsx` para rodar o TypeScript diretamente).
6. No frontend, configure `EXPO_PUBLIC_API_URL` antes do build (ver `../frontend/README.md`).