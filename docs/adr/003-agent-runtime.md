# ADR 003: Runtime do agente orientado a workflow

## Status

Accepted

## Contexto

O produto se apresenta como agente autônomo de growth, mas a V1 exige previsibilidade, rastreabilidade e aprovação manual obrigatória.

## Decisão

Modelar o agente da V1 como `workflow-oriented agent`, não como loop aberto autônomo.

Isso significa:
- jobs explícitos por etapa;
- tools bem definidas;
- outputs estruturados;
- transições de estado claras;
- checkpoints humanos obrigatórios.

## Consequências

Positivas:
- mais confiável;
- mais auditável;
- mais barato de operar;
- mais simples de testar.

Negativas:
- menos “autonomia aparente”;
- menor flexibilidade para raciocínios longos e exploratórios.

## Evolução futura

Na fase de expansão, a autonomia pode aumentar com:
- políticas de auto-aprovação por limiar;
- agentes especializados;
- experimentação automática;
- seleção automática de variantes.
