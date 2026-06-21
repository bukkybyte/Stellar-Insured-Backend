import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { SoftDeleteModel } from './prisma.soft-delete.middleware';

type SoftDeleteDelegateName = Uncapitalize<SoftDeleteModel>;

/** Generic Prisma query options shape used by soft-delete helpers. */
interface QueryOptions {
  where?: Record<string, unknown>;
  includeDeleted?: boolean;
  [key: string]: unknown;
}

interface SoftDeleteDelegate {
  delete<T>(args: { where: Record<string, unknown> }): Promise<T>;
  deleteMany(args: {
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
  update<T>(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<T>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  findUnique<T>(args: QueryOptions): Promise<T | null>;
  findMany<T>(args: QueryOptions): Promise<T[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
}

/**
 * Service providing utility methods for soft delete operations
 * Use this service when you need to:
 * - Permanently delete records (hard delete)
 * - Restore soft-deleted records
 * - Query both deleted and non-deleted records
 * - Force include deleted records in specific queries
 */
@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Permanently delete a record (hard delete)
   * WARNING: This permanently removes data from the database
   * Use only when absolutely necessary (e.g., GDPR right to be forgotten)
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @param reason - Audit reason for permanent deletion
   */
  async hardDelete<T>(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
    reason?: string,
  ): Promise<T | null> {
    this.logger.warn(
      `Hard deleting ${model as string} with where: ${JSON.stringify(where)}. Reason: ${reason || 'Not provided'}`,
    );

    return this.getDelegate(model).delete<T>({ where });
  }

  /**
   * Permanently delete multiple records (hard delete)
   * WARNING: This permanently removes data from the database
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @param reason - Audit reason for permanent deletion
   */
  async hardDeleteMany<T>(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
    reason?: string,
  ): Promise<{ count: number }> {
    this.logger.warn(
      `Hard deleting ${model as string} records. Reason: ${reason || 'Not provided'}`,
    );

    return this.getDelegate(model).deleteMany({ where });
  }

  /**
   * Restore a soft-deleted record
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns The restored record
   */
  async restore<T>(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
  ): Promise<T> {
    this.logger.log(`Restoring ${model as string} record`);

    return this.getDelegate(model).update<T>({
      where,
      data: { deletedAt: null },
    });
  }

  /**
   * Restore multiple soft-deleted records
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns Count of restored records
   */
  async restoreMany<T>(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
  ): Promise<{ count: number }> {
    this.logger.log(`Restoring multiple ${model as string} records`);

    return this.getDelegate(model).updateMany({
      where,
      data: { deletedAt: null },
    });
  }

  /**
   * Get a record including soft-deleted ones
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns The record or null
   */
  async findIncludingDeleted<T>(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
  ): Promise<T | null> {
    return this.getDelegate(model).findUnique<T>({
      where,
      ...{ includeDeleted: true },
    });
  }

  /**
   * Get multiple records including soft-deleted ones
   *
   * @param model - The model name
   * @param options - Query options
   * @returns Array of records
   */
  async findManyIncludingDeleted<T>(
    model: SoftDeleteDelegateName,
    options: QueryOptions = {},
  ): Promise<T[]> {
    return this.getDelegate(model).findMany<T>({
      ...options,
      where: {
        ...options.where,
        ...(options.includeDeleted && { _includeDeleted: true }),
      },
    });
  }

  /**
   * Get only soft-deleted records
   *
   * @param model - The model name
   * @param options - Query options
   * @returns Array of deleted records
   */
  async findManyDeleted<T>(
    model: SoftDeleteDelegateName,
    options: QueryOptions = {},
  ): Promise<T[]> {
    return this.getDelegate(model).findMany<T>({
      ...options,
      where: {
        ...options.where,
        deletedAt: { not: null },
      },
    });
  }

  /**
   * Count soft-deleted records
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns Count of deleted records
   */
  async countDeleted(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown> = {},
  ): Promise<number> {
    return this.getDelegate(model).count({
      where: {
        ...where,
        deletedAt: { not: null },
      },
    });
  }

  /**
   * Permanently delete expired soft-deleted records (cleanup)
   * Records older than the specified time are permanently deleted
   *
   * @param model - The model name
   * @param deletedBefore - Date before which to delete
   * @returns Count of permanently deleted records
   */
  async permanentlyDeleteExpired(
    model: SoftDeleteDelegateName,
    deletedBefore: Date,
  ): Promise<number> {
    this.logger.log(
      `Permanently deleting ${model as string} records deleted before ${deletedBefore.toISOString()}`,
    );

    const result = await this.getDelegate(model).deleteMany({
      where: {
        deletedAt: {
          not: null,
          lt: deletedBefore,
        },
      },
    });

    return result.count;
  }

  /**
   * Check if a record is soft-deleted
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns True if record exists and is deleted, false otherwise
   */
  async isDeleted(
    model: SoftDeleteDelegateName,
    where: Record<string, unknown>,
  ): Promise<boolean> {
    const record = await this.getDelegate(model).findUnique<{
      deletedAt?: Date | null;
    }>({
      where,
      ...{ includeDeleted: true },
    });

    return record?.deletedAt !== null && record?.deletedAt !== undefined;
  }

  private getDelegate(model: SoftDeleteDelegateName): SoftDeleteDelegate {
    return this.prisma[model] as unknown as SoftDeleteDelegate;
  }
}
