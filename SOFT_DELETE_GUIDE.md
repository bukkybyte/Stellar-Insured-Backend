# Soft Delete Implementation Guide

## Overview

This implementation provides automatic soft delete functionality for all models with a `deletedAt` field in the Prisma schema. Soft deletes allow for data recovery, maintain referential integrity, and prevent accidental permanent data loss.

## How It Works

### Middleware Architecture

The soft delete system uses Prisma middleware (`$use()`) to intercept all database operations:

1. **Automatic Deletion**: Delete operations (`delete`, `deleteMany`) are automatically converted to soft deletes by setting `deletedAt: new Date()`
2. **Filter Queries**: Find operations (`findUnique`, `findMany`, etc.) automatically exclude soft-deleted records (where `deletedAt IS NULL`)
3. **Preserve Relationships**: Soft-deleted records maintain referential integrity with related records

### Supported Models

The following models support soft delete (have `deletedAt` field):

- User
- Project
- Contribution
- Milestone
- ReputationHistory
- Category
- InsurancePool
- ReinsuranceContract
- InsurancePolicy
- Claim
- AuditLog
- LedgerCursor
- ProcessedEvent

### Files Added

1. **`prisma.soft-delete.middleware.ts`** - Core middleware implementation
2. **`prisma.soft-delete.service.ts`** - Utility service for advanced soft delete operations
3. **`prisma.soft-delete.module.ts`** - NestJS module for dependency injection

## Usage Examples

### Default Behavior: Automatic Soft Delete

```typescript
// This converts to a soft delete (sets deletedAt timestamp)
await prisma.user.delete({ where: { id: '123' } });

// Multiple records
await prisma.user.deleteMany({ where: { status: 'inactive' } });

// Deletes are transparent - deleted records are automatically excluded from queries
const user = await prisma.user.findUnique({ where: { id: '123' } });
// Returns null if user is soft-deleted
```

### Query Non-Deleted Records (Default)

```typescript
// Automatically filters out deleted records
const activeUsers = await prisma.user.findMany();
// Returns only users where deletedAt IS NULL

const activeUsersCount = await prisma.user.count();
// Only counts non-deleted records
```

### Include Soft-Deleted Records

Use the `SoftDeleteService` to include deleted records in queries:

```typescript
import { SoftDeleteService } from './prisma.soft-delete.service';

export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly softDelete: SoftDeleteService,
  ) {}

  // Get all users including deleted ones
  async getAllUsers() {
    return this.softDelete.findManyIncludingDeleted('user');
    // Or with options
    return this.softDelete.findManyIncludingDeleted('user', {
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  // Get only deleted users
  async getDeletedUsers() {
    return this.softDelete.findManyDeleted('user');
  }

  // Check if a user is deleted
  async isUserDeleted(userId: string) {
    return this.softDelete.isDeleted('user', { id: userId });
  }
}
```

### Restore Soft-Deleted Records

```typescript
constructor(private readonly softDelete: SoftDeleteService) {}

// Restore single record
await this.softDelete.restore('user', { id: '123' });

// Restore multiple records
await this.softDelete.restoreMany('user', { department: 'engineering' });
```

### Hard Delete (Permanent Deletion)

Use hard delete sparingly - only when required by policy (e.g., GDPR right to be forgotten):

```typescript
// Permanently delete a single record
await this.softDelete.hardDelete('user', { id: '123' }, 'GDPR right to be forgotten');

// Permanently delete multiple records
await this.softDelete.hardDeleteMany(
  'user',
  { status: 'banned' },
  'User cleanup after account suspension period',
);
```

### Maintenance: Clean Up Old Deletions

Remove soft-deleted records that are older than a certain date:

```typescript
// Permanently delete records soft-deleted over 30 days ago
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const deletedCount = await this.softDelete.permanentlyDeleteExpired('auditLog', thirtyDaysAgo);
console.log(`Permanently deleted ${deletedCount} audit logs`);
```

## Advanced Usage

### In Service Layer

```typescript
import { Injectable } from '@nestjs/common';
import { SoftDeleteService } from './prisma.soft-delete.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly softDelete: SoftDeleteService,
  ) {}

  async deactivateUser(userId: string) {
    // Soft delete the user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return user;
  }

  async reactivateUser(userId: string) {
    // Restore the soft-deleted user
    return this.softDelete.restore('user', { id: userId });
  }

  async getUserWithDeletedRecords(userId: string) {
    // Get user including soft-deleted policies
    return this.softDelete.findIncludingDeleted('user', { id: userId });
  }

  async auditDeletedUsers() {
    const deletedCount = await this.softDelete.countDeleted('user');
    const deletedUsers = await this.softDelete.findManyDeleted('user');

    return {
      total: deletedCount,
      users: deletedUsers,
    };
  }
}
```

### Cascade Behavior

When a parent record is soft-deleted, related records are NOT automatically deleted. This maintains data integrity:

```typescript
// When user is soft-deleted:
await prisma.user.delete({ where: { id: 'user-123' } });

// Their policies will still exist but won't be returned in queries
// unless you explicitly include deleted records

// To also soft-delete related records:
await prisma.insurancePolicy.deleteMany({
  where: { userId: 'user-123' },
});
```

## Module Integration

Import `SoftDeleteModule` in your feature modules to access `SoftDeleteService`:

```typescript
import { Module } from '@nestjs/common';
import { SoftDeleteModule } from './prisma.soft-delete.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [SoftDeleteModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
```

## Best Practices

### 1. **Always Use Standard Prisma Methods**

```typescript
// ✅ Good - Automatically soft-deleted
await prisma.user.delete({ where: { id: '123' } });

// ❌ Bad - Hard delete through raw queries
await prisma.$executeRaw`DELETE FROM users WHERE id = '123'`;
```

### 2. **Restore Deleted Records**

```typescript
// ✅ Better - User can recover deleted data
if (condition) {
  await this.softDelete.restore('user', { id: userId });
}

// ❌ Worse - Permanently lost data
// Hard deletes should be rare exceptions
```

### 3. **Audit Trail**

Soft deletes combined with AuditLog records provide a complete audit trail:

```typescript
// AuditLog is also soft-deleted, preserving deletion history
const auditTrail = await this.softDelete.findManyIncludingDeleted('auditLog', {
  where: { entityId: userId },
  orderBy: { timestamp: 'desc' },
});
```

### 4. **Cleanup Strategy**

For compliance (e.g., GDPR), implement a cleanup strategy:

```typescript
// Only hard delete after retention period expires
const retentionDays = 90;
const expirationDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

await this.softDelete.permanentlyDeleteExpired('user', expirationDate);
```

### 5. **Testing**

```typescript
describe('User Service', () => {
  it('should soft-delete user', async () => {
    const user = await service.deleteUser(userId);
    expect(user.deletedAt).toBeDefined();
  });

  it('should exclude deleted users from queries', async () => {
    await prisma.user.delete({ where: { id: userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeNull();
  });

  it('should find deleted user with includeDeleted', async () => {
    await prisma.user.delete({ where: { id: userId } });
    const user = await softDelete.findIncludingDeleted('user', { id: userId });
    expect(user).toBeDefined();
    expect(user.deletedAt).not.toBeNull();
  });
});
```

## Troubleshooting

### Issue: Hard Deletes Happening by Accident

**Solution**: Use `SoftDeleteService.hardDelete()` explicitly. All regular `delete()` calls are converted to soft deletes.

### Issue: Deleted Records Appearing in Results

**Solution**: The middleware only filters for non-soft-delete operations. To query with deleted records:

```typescript
const results = await softDelete.findManyIncludingDeleted('model', {
  // your query options
});
```

### Issue: Need to Restore Multiple Records

**Solution**: Use `restoreMany()`:

```typescript
await softDelete.restoreMany('user', { deletedAt: { not: null } });
```

### Issue: Performance with Large Deleted Datasets

**Solution**: Periodically clean up old deletions:

```typescript
// CronJob to delete records older than 90 days
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
await softDelete.permanentlyDeleteExpired('auditLog', ninetyDaysAgo);
```

## Migration Guide

If you have existing data that needs the `deletedAt` field:

1. Ensure all models have `deletedAt DateTime? @map("deleted_at")` field
2. Run `npm run prisma:migrate:dev` to create migrations
3. The middleware will automatically handle new deletions as soft deletes
4. Existing null `deletedAt` values mean the record is not deleted

## Performance Considerations

- **Indexes**: All models have `@@index([deletedAt])` for efficient queries
- **Query Filtering**: The middleware adds minimal overhead (single WHERE clause comparison)
- **Storage**: Soft-deleted records still consume disk space
- **Cleanup**: Use `permanentlyDeleteExpired()` for periodic cleanup

## Schema Reference

All soft-delete models include:

```prisma
deletedAt    DateTime? @map("deleted_at")

@@index([deletedAt])
```

This allows efficient filtering in queries.
