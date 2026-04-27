/**
 * Example: Using Soft Delete in Your Services
 * 
 * This file demonstrates common patterns for using soft delete functionality
 * in your NestJS services. Copy and adapt these patterns for your own services.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SoftDeleteService } from './prisma.soft-delete.service';

/**
 * Example 1: Basic CRUD with Automatic Soft Delete
 */
@Injectable()
export class ExampleUserService {
  constructor(private readonly prisma: PrismaService) {}

  // Create
  async createUser(data: { walletAddress: string; email?: string }) {
    return this.prisma.user.create({ data });
  }

  // Read - automatically excludes deleted users
  async getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Read all - automatically excludes deleted users
  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  // Update
  async updateUser(id: string, data: any) {
    return this.prisma.user.update({ where: { id }, data });
  }

  // Delete - automatically becomes soft delete
  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // Count - automatically excludes deleted users
  async countUsers() {
    return this.prisma.user.count();
  }
}

/**
 * Example 2: Advanced Operations with SoftDeleteService
 */
@Injectable()
export class ExampleAdvancedUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly softDelete: SoftDeleteService,
  ) {}

  // Get deleted users (for admin panel)
  async getDeletedUsers() {
    return this.softDelete.findManyDeleted('user');
  }

  // Get all users including deleted (audit view)
  async getAuditView() {
    return this.softDelete.findManyIncludingDeleted('user', {
      orderBy: { deletedAt: 'desc' },
    });
  }

  // Restore a deleted user
  async restoreUser(id: string) {
    return this.softDelete.restore('user', { id });
  }

  // Bulk restore users from a department
  async restoreDepartment(department: string) {
    return this.softDelete.restoreMany('user', { department });
  }

  // Permanently delete (only after retention period)
  async permanentlyDeleteExpiredUsers() {
    const retentionDays = 90;
    const expirationDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    return this.softDelete.permanentlyDeleteExpired('user', expirationDate);
  }

  // Check deletion status
  async isUserDeleted(id: string): Promise<boolean> {
    return this.softDelete.isDeleted('user', { id });
  }

  // Get statistics about deletions
  async getDeletionStats() {
    const totalUsers = await this.prisma.user.count();
    const deletedCount = await this.softDelete.countDeleted('user');
    const activeCount = totalUsers - deletedCount;

    return {
      total: totalUsers,
      active: activeCount,
      deleted: deletedCount,
      percentageActive: ((activeCount / totalUsers) * 100).toFixed(2),
    };
  }
}

/**
 * Example 3: Cascade Soft Deletes (Deleting Related Records)
 */
@Injectable()
export class ExampleCascadeDeleteService {
  constructor(private readonly prisma: PrismaService) {}

  // Deactivate a user and all their related records
  async deactivateUserCascade(userId: string) {
    // Delete the user (soft delete)
    const user = await this.prisma.user.delete({ where: { id: userId } });

    // Also soft-delete all their insurance policies
    await this.prisma.insurancePolicy.deleteMany({
      where: { userId },
    });

    // Also soft-delete all their claims
    await this.prisma.claim.deleteMany({
      where: {
        policy: {
          userId,
        },
      },
    });

    return {
      message: 'User and related records soft-deleted',
      userId,
    };
  }

  // Restore a user and optionally their related records
  async restoreUserCascade(userId: string, restoreRelated = true) {
    if (restoreRelated) {
      // Restore all soft-deleted policies
      await this.prisma.insurancePolicy.updateMany({
        where: { userId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      // Restore all soft-deleted claims
      const policies = await this.prisma.insurancePolicy.findMany({
        where: { userId },
      });

      for (const policy of policies) {
        await this.prisma.claim.updateMany({
          where: { policyId: policy.id, deletedAt: { not: null } },
          data: { deletedAt: null },
        });
      }
    }

    // Restore the user
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });
  }
}

/**
 * Example 4: Query Patterns with Soft Delete
 */
@Injectable()
export class ExampleQueryPatternsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly softDelete: SoftDeleteService,
  ) {}

  // Pattern 1: Paginated active records
  async getPaginatedActiveUsers(skip = 0, take = 10) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, page: skip / take + 1 };
  }

  // Pattern 2: Search with deleted records option
  async searchUsers(query: string, includeDeleted = false) {
    if (includeDeleted) {
      return this.softDelete.findManyIncludingDeleted('user', {
        where: {
          walletAddress: {
            contains: query,
            mode: 'insensitive',
          },
        },
      });
    } else {
      return this.prisma.user.findMany({
        where: {
          walletAddress: {
            contains: query,
            mode: 'insensitive',
          },
        },
      });
    }
  }

  // Pattern 3: Timeline view (show all actions including deletes)
  async getUserTimeline(userId: string) {
    const [user, policies, deletionStatus] = await Promise.all([
      this.softDelete.findIncludingDeleted('user', { id: userId }),
      this.softDelete.findManyIncludingDeleted('insurancePolicy', {
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.softDelete.isDeleted('user', { id: userId }),
    ]);

    return {
      user,
      isDeleted: deletionStatus,
      policies,
    };
  }

  // Pattern 4: Conditional operations
  async updateUserIfNotDeleted(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found or is deleted');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}

/**
 * Example 5: Testing Patterns
 */
describe('Soft Delete Examples', () => {
  let service: ExampleUserService;
  let softDeleteService: SoftDeleteService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Test module setup would go here
  });

  // Test soft delete functionality
  it('should soft-delete a user', async () => {
    const user = await service.createUser({ walletAddress: 'test' });
    await service.deleteUser(user.id);

    const deletedUser = await service.getUser(user.id);
    expect(deletedUser).toBeNull();
  });

  it('should restore a soft-deleted user', async () => {
    const user = await service.createUser({ walletAddress: 'test' });
    await service.deleteUser(user.id);

    const restored = await softDeleteService.restore('user', { id: user.id });
    expect(restored.deletedAt).toBeNull();

    const found = await service.getUser(user.id);
    expect(found).toBeDefined();
  });

  it('should find deleted users with includeDeleted', async () => {
    const user = await service.createUser({ walletAddress: 'test' });
    await service.deleteUser(user.id);

    const found = await softDeleteService.findIncludingDeleted('user', { id: user.id });
    expect(found).toBeDefined();
    expect(found.deletedAt).not.toBeNull();
  });

  it('should count only active users', async () => {
    const count1 = await service.countUsers();

    const user = await service.createUser({ walletAddress: 'test' });
    const count2 = await service.countUsers();
    expect(count2).toBe(count1 + 1);

    await service.deleteUser(user.id);
    const count3 = await service.countUsers();
    expect(count3).toBe(count1);
  });

  it('should permanently delete expired soft-deleted records', async () => {
    const user = await service.createUser({ walletAddress: 'test' });
    await service.deleteUser(user.id);

    // Set deletion date to 100 days ago
    await prisma.$executeRawUnsafe(
      `UPDATE users SET deleted_at = NOW() - INTERVAL '100 days' WHERE id = $1`,
      user.id,
    );

    const deletedCount = await softDeleteService.permanentlyDeleteExpired(
      'user',
      new Date(),
    );

    expect(deletedCount).toBeGreaterThan(0);

    const stillThere = await softDeleteService.findIncludingDeleted('user', { id: user.id });
    expect(stillThere).toBeNull();
  });
});
