# Definição da API do Backend

Base URL local: `http://localhost:3000`. Todas as respostas e corpos de requisição são JSON.
Autenticação via `Authorization: Bearer <token>` (JWT obtido em `/auth/login` ou
`/auth/registrar`). Erros seguem o formato `{ "erro": "mensagem" }` (ou `{"erro", "detalhes"}`
para erro de validação).

Papéis: `CLIENTE` (padrão no autocadastro) e `OPERADOR` (bilheteria/gerência).

## Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/registrar` | - | Cria usuário (sempre `CLIENTE`). Body: `{ nome, email, senha }` |
| POST | `/auth/login` | - | Autentica. Body: `{ email, senha }`. Retorna `{ usuario, token }` |
| GET | `/auth/me` | qualquer | Retorna o usuário autenticado |

## Filmes/Eventos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/eventos` | - | Lista filmes/eventos |
| GET | `/eventos/:id` | - | Detalhe de um filme/evento |
| POST | `/eventos` | OPERADOR | Cria. Body: `{ titulo, descricao?, duracaoMinutos }` |
| PUT | `/eventos/:id` | OPERADOR | Atualiza (campos parciais) |
| DELETE | `/eventos/:id` | OPERADOR | Remove |

## Salas e assentos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/salas` | - | Lista salas (com assentos) |
| GET | `/salas/:id` | - | Detalhe de uma sala |
| POST | `/salas` | OPERADOR | Cria. Body: `{ nome }` |
| PUT | `/salas/:id` | OPERADOR | Atualiza |
| DELETE | `/salas/:id` | OPERADOR | Remove |
| POST | `/salas/:id/assentos` | OPERADOR | Gera assentos em lote. Body: `{ filas: string[], assentosPorFila: number }`. Só funciona se a sala ainda não tiver assentos |

## Sessões

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/sessoes` | - | Lista sessões (com evento e sala) |
| GET | `/sessoes/:id` | - | Detalhe de uma sessão |
| POST | `/sessoes` | OPERADOR | Cria. Body: `{ eventoId, salaId, dataHora (ISO), preco }` |
| PUT | `/sessoes/:id` | OPERADOR | Atualiza (campos parciais) |
| DELETE | `/sessoes/:id` | OPERADOR | Remove |
| GET | `/sessoes/:id/mapa-assentos` | - | Mapa de assentos da sessão: `[{ id, fila, numero, status }]`, `status` em `livre\|reservado\|vendido` |
| POST | `/sessoes/:id/reservas` | qualquer | Reserva temporária. Body: `{ assentoIds: number[] }`. Retorna `{ reservas, expiraEm }` |

## Pagamento

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/pagamentos` | qualquer | Confirma pagamento (simulado) de reservas do usuário autenticado. Body: `{ reservaIds: number[] }`. Retorna `{ vendaId, ingressos }` |

## Ingressos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/ingressos/meus` | qualquer | Ingressos do usuário autenticado |
| GET | `/ingressos/:codigo` | OPERADOR | Busca ingresso pelo código único (uso na bilheteria) |
| POST | `/ingressos/:codigo/validar` | OPERADOR | Marca o ingresso como utilizado (falha se já utilizado) |

## Relatórios

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/relatorios/vendas` | OPERADOR | Totais e detalhamento de vendas por sessão |
| GET | `/relatorios/ocupacao` | OPERADOR | Taxa de ocupação por sessão. Query opcional `?sessaoId=` |

## Exemplo de fluxo completo (cliente)

1. `POST /auth/login` → `{ token }`
2. `GET /sessoes` → escolhe uma sessão
3. `GET /sessoes/:id/mapa-assentos` → escolhe assentos livres
4. `POST /sessoes/:id/reservas` com `{ assentoIds }` → `{ reservas, expiraEm }`
5. `POST /pagamentos` com `{ reservaIds }` → `{ ingressos }` (cada um com `codigoUnico`)
6. `GET /ingressos/meus` → conferir ingressos emitidos
