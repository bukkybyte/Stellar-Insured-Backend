# ORM Recommendation

## Summary

This repository currently uses both Prisma and TypeORM for database access.

### Found evidence

- `package.json` includes:
  - `@prisma/client` and `prisma`
  - `typeorm` and `@nestjs/typeorm`
- Database migration scripts run both systems:
  - `db:migrate`
  - `db:migrate:dev`
- TypeORM usage appears in insurance and reputation entities and services.
- Prisma usage appears in application services, user management, indexing, notification, idempotency, and reputation logic.

## Problem

Mixed ORM usage creates several issues:

- inconsistent database access patterns across the app
- harder maintenance and onboarding
- difficult transaction and schema coordination
- potential data consistency and migration drift

## Recommendation

Choose one of the following approaches:

1. **Consolidate on a single ORM**
   - Prefer the ORM that already owns the largest or most critical domain.
   - Migrate the other domain to that ORM over time.
   - Remove the unused ORM dependencies and migration scripts.

2. **Separate domains explicitly**
   - If both ORMs must remain, isolate their usage to distinct bounded contexts.
   - Avoid sharing tables between Prisma and TypeORM.
   - Document clear ownership for each table and service layer.

## Suggested next steps

- Audit tables and services by ORM ownership.
- Identify shared schema or table overlap.
- Decide whether the app should standardize on Prisma or TypeORM.
- Update migration strategy to one coherent toolchain.

## Notes

A consistent ORM strategy will improve maintainability, reduce risk, and simplify future database refactors.
