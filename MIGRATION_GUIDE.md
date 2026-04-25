# Database Migration Guide

This project uses two database ORMs: **Prisma** and **TypeORM**. Both require proper migration management for safe schema evolution.

## Overview

- **Prisma**: Used for main application models (User, Project, Notification, etc.)
- **TypeORM**: Used for insurance-related entities (InsurancePolicy, Claim, InsurancePool, ReinsuranceContract)

## Prisma Migrations

### Development

Create a new migration:
```bash
npm run prisma:migrate:generate -- add_user_email
```

This will:
1. Detect changes in `prisma/schema.prisma`
2. Generate SQL migration file in `prisma/migrations/`
3. Apply migration to your local database

Reset database (WARNING: Deletes all data):
```bash
npm run prisma:migrate:reset
```

Open Prisma Studio to view/edit data:
```bash
npm run prisma:studio
```

### Production

Deploy pending migrations:
```bash
npm run prisma:migrate:deploy
```

This applies migrations without modifying the migration history.

## TypeORM Migrations

### Development

Generate a new migration from entity changes:
```bash
npm run typeorm:migrate:generate -- -n AddPolicyFields
```

This creates a migration file in `insurance/migrations/` based on differences between entities and database.

Run migrations:
```bash
npm run typeorm:migrate:run
```

Revert last migration:
```bash
npm run typeorm:migrate:revert
```

Show migration status:
```bash
npm run typeorm:migrate:show
```

### Production

Run all pending migrations:
```bash
npm run typeorm:migrate:run
```

## Combined Migration Commands

For development (both Prisma and TypeORM):
```bash
npm run db:migrate:dev
```

For production deployment:
```bash
npm run db:migrate
```

## Migration Workflow

### Making Schema Changes

1. **Update schema files**:
   - Prisma: Edit `prisma/schema.prisma`
   - TypeORM: Edit entity files in `insurance/entities/`

2. **Generate migrations**:
   ```bash
   npm run prisma:migrate:generate -- describe_change
   npm run typeorm:migrate:generate -- -n DescribeChange
   ```

3. **Review generated SQL**:
   - Check `prisma/migrations/[timestamp]_describe_change/migration.sql`
   - Check `insurance/migrations/[timestamp]-DescribeChange.ts`

4. **Test locally**:
   ```bash
   npm run db:migrate:dev
   ```

5. **Commit migration files**:
   ```bash
   git add prisma/migrations/ insurance/migrations/
   git commit -m "feat: add database migration for feature X"
   ```

6. **Deploy to production**:
   ```bash
   npm run db:migrate
   ```

### Best Practices

1. **Always review migrations before applying** - Especially in production
2. **Never edit migration files** after they've been applied
3. **Test migrations on a staging database** before production
4. **Backup database** before running production migrations
5. **Use descriptive names** for migrations (e.g., `add_user_email`, not `update`)
6. **One logical change per migration** - Don't bundle unrelated changes
7. **Test rollbacks** - Ensure `typeorm:migrate:revert` works correctly
8. **Monitor migration logs** - Watch for errors or warnings

### Handling Migration Conflicts

When multiple developers create migrations:

1. Pull latest changes
2. Run existing migrations: `npm run db:migrate:dev`
3. Generate your migration
4. Test the complete migration chain
5. Commit and push

### Emergency Rollback

If a migration causes issues:

**TypeORM**:
```bash
npm run typeorm:migrate:revert
```

**Prisma**:
Prisma doesn't support automatic rollback. You must:
1. Manually write a reverse migration SQL
2. Apply it using `prisma db execute`
3. Or restore from backup

### Important Notes

- **NEVER** use `prisma db push` in production - it doesn't create migration files
- **NEVER** set `synchronize: true` in TypeORM for production - it can drop columns
- **ALWAYS** commit migration files to version control
- **ALWAYS** test migrations with production-like data volumes

## Troubleshooting

### Migration fails halfway through
- TypeORM migrations run in transactions by default
- Prisma migrations are atomic
- Database should rollback automatically
- Check logs for specific error

### "Migration already applied" error
- Migration history is out of sync
- Run `prisma migrate resolve --applied [migration_name]` for Prisma
- Check `typeorm_migrations` table for TypeORM

### Entity/Schema doesn't match database
- Generate new migration to sync: `npm run typeorm:migrate:generate`
- Or reset database (dev only): `npm run prisma:migrate:reset`

## Environment Variables

Required for migrations:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stellar_insured
```

For production, ensure:
- Database user has ALTER TABLE permissions
- Connection pool is configured correctly
- SSL is enabled if required
