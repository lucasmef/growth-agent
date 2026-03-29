# ADR 004: Admin Lab and Publication Profiles

## Status

Accepted

## Context

O produto precisa atender dois usos diferentes:

- clientes, que exigem governanca e aprovacao manual;
- time interno, que precisa testar padroes de publicacao em contas novas e aprender com esses resultados.

Se ambos os modos ficarem misturados nas mesmas regras, a base fica confusa e arriscada.

## Decision

Adotar dois modos explicitos de projeto:

- `CLIENT_MANAGED`
- `EXPERIMENT`

E duas politicas explicitas de aprovacao:

- `MANUAL_REQUIRED`
- `AUTO_APPROVE`

Restricao de dominio:

- `AUTO_APPROVE` so e permitido para `platform admin` em `workspace.type = ADMIN_LAB`.

Tambem introduzimos dois agregados novos:

- `PublicationProfile`: template reutilizavel de operacao editorial e publicacao;
- `ExperimentRun`: execucao observavel de um teste autonomo.

## Consequences

Beneficios:

- separa claramente operacao de cliente e laboratorio;
- permite experimentar sem quebrar a regra de seguranca dos clientes;
- cria um caminho natural de aprendizado: experimento -> profile -> cliente;
- prepara o sistema para A/B testing e recomendacao de perfis.

Custos:

- aumenta a modelagem de dominio;
- exige autorizacao global de admin;
- pede telas e jobs dedicados para o admin lab.

## Notes

`PublicationProfile` nao deve virar um conjunto solto de prompts. Ele precisa representar defaults operacionais completos:

- preset de estrategia;
- preset de planejamento;
- preset de publicacao;
- guardrails;
- success criteria.
