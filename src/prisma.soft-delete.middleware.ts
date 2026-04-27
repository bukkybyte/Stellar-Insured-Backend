import { Prisma } from '@prisma/client';

/**
 * Models that support soft delete (have deletedAt field)
 */
export const SOFT_DELETE_MODELS = [
  'User',
  'Project',
  'Contribution',
  'Milestone',
  'ReputationHistory',
  'Category',
  'InsurancePool',
  'ReinsuranceContract',
  'InsurancePolicy',
  'Claim',
  'AuditLog',
  'LedgerCursor',
  'ProcessedEvent',
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

/**
 * Configuration for soft delete behavior
 */
export interface SoftDeleteConfig {
  /**
   * Whether to exclude soft-deleted records by default
   * Can be overridden per query with includeDeleted flag
   */
  excludeDeleted?: boolean;
}

/**
 * Query extension to include soft-deleted records
 * Usage: await prisma.user.findMany({ includeDeleted: true })
 */
declare global {
  namespace PrismaJson {}
}

/**
 * Create soft delete middleware for Prisma
 * This middleware automatically filters out soft-deleted records
 * and prevents hard deletes unless explicitly allowed
 */
export function createSoftDeleteMiddleware(
  config: SoftDeleteConfig = { excludeDeleted: true },
) {
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    const { model, action, args, dataPath } = params;

    // Only apply to models that support soft delete
    if (!SOFT_DELETE_MODELS.includes(model as SoftDeleteModel)) {
      return next(params);
    }

    // Handle find operations - add where clause for soft delete
    if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findMany'].includes(action)) {
      // Check if includeDeleted is explicitly set to true in query options
      const includeDeleted = (args.where as any)?._includeDeleted === true || args.includeDeleted === true;

      if (config.excludeDeleted && !includeDeleted) {
        // Add deletedAt filter to where clause
        args.where = {
          ...args.where,
          deletedAt: null,
        };
      }

      // Remove the flag from the query before sending to database
      if ((args.where as any)?._includeDeleted !== undefined) {
        delete (args.where as any)._includeDeleted;
      }
      if (args.includeDeleted !== undefined) {
        delete args.includeDeleted;
      }
    }

    // Handle update operations - prevent updating through relations
    if (action === 'update' || action === 'updateMany') {
      // Only update non-deleted records
      if (config.excludeDeleted) {
        args.where = {
          ...args.where,
          deletedAt: null,
        };
      }
    }

    // Handle delete operations - convert to soft delete
    if (action === 'delete' || action === 'deleteMany') {
      // Convert delete to update with deletedAt timestamp
      const deleteArgs = args as any;

      // Build update args
      const updateArgs = {
        where: deleteArgs.where,
        data: {
          deletedAt: new Date(),
        },
      };

      // Execute update instead of delete
      return next({
        ...params,
        action: action === 'delete' ? 'update' : 'updateMany',
        args: updateArgs,
      });
    }

    // Handle count operations - exclude soft-deleted records
    if (action === 'count') {
      const includeDeleted = (args.where as any)?._includeDeleted === true || args.includeDeleted === true;

      if (config.excludeDeleted && !includeDeleted) {
        args.where = {
          ...args.where,
          deletedAt: null,
        };
      }

      if ((args.where as any)?._includeDeleted !== undefined) {
        delete (args.where as any)._includeDeleted;
      }
      if (args.includeDeleted !== undefined) {
        delete args.includeDeleted;
      }
    }

    // Handle aggregate operations - exclude soft-deleted records
    if (action === 'aggregate') {
      const includeDeleted = (args.where as any)?._includeDeleted === true || args.includeDeleted === true;

      if (config.excludeDeleted && !includeDeleted) {
        args.where = {
          ...args.where,
          deletedAt: null,
        };
      }

      if ((args.where as any)?._includeDeleted !== undefined) {
        delete (args.where as any)._includeDeleted;
      }
      if (args.includeDeleted !== undefined) {
        delete args.includeDeleted;
      }
    }

    return next(params);
  };
}
