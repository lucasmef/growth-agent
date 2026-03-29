# ADR 001: Modular Monolith na V1

## Status

Accepted

## Contexto

A V1 precisa ser pequena, correta, rápida de entregar e simples de operar. O produto ainda está validando um caso real de growth e não demanda complexidade operacional de microserviços.

## Decisão

Implementar a V1 como `modular monolith` com:

- `Next.js` para app e APIs;
- `Trigger.dev` para jobs assíncronos;
- `PostgreSQL` como banco principal.

## Consequências

Positivas:
- menor custo operacional;
- DX melhor;
- deploy mais simples;
- transações e consistência mais fáceis;
- menor overhead cognitivo.

Negativas:
- exige disciplina de limites entre módulos;
- risco de acoplamento acidental se a equipe não respeitar contratos;
- futura extração de serviços precisa partir de contextos bem definidos.

## Regra de evolução

Somente extrair serviço dedicado quando houver um destes sinais:

- limite operacional claro;
- necessidade de escalabilidade independente;
- requisitos de isolamento de falha;
- domínio suficientemente estável e separado.
