# Diagrama de Casos de Uso

Três atores, dois papéis de sistema (`CLIENTE` e `OPERADOR` — Bilheteria e Gerência usam o
mesmo papel `OPERADOR`, apenas em telas diferentes do mesmo app, conforme o enunciado).

```mermaid
flowchart LR
    Cliente([Cliente])
    Bilheteria([Bilheteria])
    Gerencia([Gerência])

    subgraph Autenticacao[Autenticação]
        UC1((Cadastrar-se))
        UC2((Autenticar-se))
    end

    subgraph Compra[Compra de ingressos]
        UC3((Listar sessões))
        UC4((Ver mapa de assentos))
        UC5((Reservar assentos))
        UC6((Pagar reserva - simulado))
        UC7((Ver meus ingressos))
    end

    subgraph Balcao[Atendimento no balcão]
        UC8((Vender ingresso no balcão))
        UC9((Validar ingresso na entrada))
    end

    subgraph Gestao[Cadastros e relatórios]
        UC10((Cadastrar filme-evento))
        UC11((Cadastrar sala e assentos))
        UC12((Cadastrar sessão))
        UC13((Consultar relatório de vendas))
        UC14((Consultar relatório de ocupação))
    end

    Cliente --> UC1
    Cliente --> UC2
    Cliente --> UC3
    Cliente --> UC4
    Cliente --> UC5
    Cliente --> UC6
    Cliente --> UC7

    Bilheteria --> UC2
    Bilheteria --> UC8
    Bilheteria --> UC9
    UC8 -.inclui.-> UC4
    UC8 -.inclui.-> UC5
    UC8 -.inclui.-> UC6

    Gerencia --> UC2
    Gerencia --> UC10
    Gerencia --> UC11
    Gerencia --> UC12
    Gerencia --> UC13
    Gerencia --> UC14
```

## Descrição por ator

### Cliente
- **Cadastrar-se / Autenticar-se**: cria conta (sempre como cliente) ou faz login.
- **Listar sessões**: vê filmes/eventos com sessão futura (sala, data/hora, preço).
- **Ver mapa de assentos**: para uma sessão, vê todos os assentos da sala com status
  livre/reservado/vendido.
- **Reservar assentos**: seleciona um ou mais assentos livres; o sistema cria uma reserva
  temporária com prazo de expiração.
- **Pagar reserva**: confirma o pagamento (simulado) da reserva antes de expirar; o sistema
  emite um ingresso com código único por assento.
- **Ver meus ingressos**: lista os ingressos já emitidos, com código e status.

### Bilheteria (papel operador)
- **Vender ingresso no balcão**: mesmo fluxo do cliente (mapa de assentos → reserva →
  pagamento), realizado pelo atendente para uma venda presencial.
- **Validar ingresso na entrada**: busca um ingresso pelo código e marca como utilizado; um
  ingresso já utilizado não pode ser validado de novo.

### Gerência (papel operador)
- **Cadastrar filme/evento**: título, descrição e duração.
- **Cadastrar sala e assentos**: cria a sala e gera o conjunto fixo de assentos (fileiras x
  numeração); só pode ser feito uma vez por sala.
- **Cadastrar sessão**: associa um filme/evento a uma sala, define data/hora e preço.
- **Consultar relatório de vendas**: total vendido, ingressos emitidos e detalhamento por sessão.
- **Consultar relatório de ocupação**: percentual de assentos vendidos/reservados por sessão.

## Fluxos alternativos relevantes

- **Reserva expirada**: se o cliente não pagar dentro do prazo, a reserva expira
  automaticamente (trigger no banco) e o assento volta a ficar livre para qualquer cliente.
- **Disputa pelo mesmo assento**: se dois clientes tentarem reservar o mesmo assento da mesma
  sessão ao mesmo tempo, apenas um consegue; o outro recebe erro de conflito e deve escolher
  outro assento — garantido por transação com travamento (advisory lock) e índice único
  parcial no banco.
- **Ingresso já utilizado**: tentativa de validar novamente um ingresso já utilizado é rejeitada.
