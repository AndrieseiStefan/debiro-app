# Architecture

TASK-002 selected the application architecture; it did not implement it. Start with:

- [System architecture](system-architecture.md): boundaries, flow, and intended repository shape.
- [Technology stack](technology-stack.md): selected technologies and evaluated alternatives.
- [Deployment](deployment.md): topology, environments, operations, and recovery.
- [Security and data](security-and-data.md): tenancy, files, data location, and provider gates.
- [Cost model](cost-model.md): dated official pricing, workload assumptions, and estimates.
- [ADR-0002](../decisions/0002-application-architecture-and-stack.md): accepted decision and trade-offs.

Documentation grows with accepted decisions and actual implementation. Do not create detailed feature contracts ahead of their defining tasks. Domain-dependent URLs must use configuration so a later change from `debiro.ro` does not change business logic.
