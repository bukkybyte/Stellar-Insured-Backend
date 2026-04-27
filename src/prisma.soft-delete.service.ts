import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

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
    model: keyof PrismaService,
    where: any,
    reason?: string,
  ): Promise<T | null> {
    this.logger.warn(
      `Hard deleting ${model as string} with where: ${JSON.stringify(where)}. Reason: ${reason || 'Not provided'}`,
    );

    const prismaModel = (this.prisma[model] as any);
    return prismaModel.delete({ where });
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
    model: keyof PrismaService,
    where: any,
    reason?: string,
  ): Promise<{ count: number }> {
    this.logger.warn(
      `Hard deleting ${model as string} records. Reason: ${reason || 'Not provided'}`,
    );

    const prismaModel = (this.prisma[model] as any);
    return prismaModel.deleteMany({ where });
  }

  /**
   * Restore a soft-deleted record
   *
   * @param model - The model name
   * @param where - Filter conditions
   * @returns The restored record
   */
  async restore<T>(model: keyof PrismaService, where: any): Promise<T> {
    this.logger.log(`Restoring ${model as string} record`);

    const prismaModel = (this.prisma[model] as any);
    return prismaModel.update({
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
  async restoreMany<T>(model: keyof PrismaService, where: any): Promise<{ count: number }> {
    this.logger.log(`Restoring multiple ${model as string} records`);

    const prismaModel = (this.prisma[model] as any);
    return prismaModel.updateMany({
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
    model: keyof PrismaService,
    where: any,
  ): Promise<T | null> {
    const prismaModel = (this.prisma[model] as any);
    return prismaModel.findUnique({
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
    model: keyof PrismaService,
    options: any = {},
  ): Promise<T[]> {
    const prismaModel = (this.prisma[model] as any);
    return prismaModel.findMany({
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
    model: keyof PrismaService,
    options: any = {},
  ): Promise<T[]> {
    const prismaModel = (this.prisma[model] as any);
    return prismaModel.findMany({
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
  async countDeleted(model: keyof PrismaService, where: any = {}): Promise<number> {
    const prismaModel = (this.prisma[model] as any);
    return prismaModel.count({
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
    model: keyof PrismaService,
    deletedBefore: Date,
  ): Promise<number> {
    this.logger.log(
      `Permanently deleting ${model as string} records deleted before ${deletedBefore.toISOString()}`,
    );

    const prismaModel = (this.prisma[model] as any);
    const result = await prismaModel.deleteMany({
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
  async isDeleted(model: keyof PrismaService, where: any): Promise<boolean> {
    const prismaModel = (this.prisma[model] as any);
    const record = await prismaModel.findUnique({
      where,
      ...{ includeDeleted: true },
    });

    return record?.deletedAt !== null && record?.deletedAt !== undefined;
  }
}
