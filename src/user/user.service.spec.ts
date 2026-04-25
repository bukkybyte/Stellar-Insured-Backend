import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

const prisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as any;

const encryption = {
  encrypt: jest.fn((value: string) => `encrypted:${value}`),
  decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
} as any;

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(prisma, encryption);
    jest.clearAllMocks();
  });

  it('filters soft-deleted users from id lookups', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findById('user-1')).rejects.toThrow(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        deletedAt: null,
      },
    });
  });

  it('filters soft-deleted users from wallet lookups', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findByWallet('GABC123')).rejects.toThrow(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        walletAddress: 'GABC123',
        deletedAt: null,
      },
    });
  });

  it('excludes soft-deleted users from pagination and totals', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        walletAddress: 'encrypted:GABC123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    prisma.user.count.mockResolvedValue(1);

    const result = await service.findPaginated(2, 10);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      skip: 10,
      take: 10,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('marks a user as deleted instead of hard deleting the record', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      walletAddress: 'encrypted:GABC123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      deletedAt: new Date('2026-04-24T00:00:00.000Z'),
    });

    const result = await service.delete('user-1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      id: 'user-1',
      deletedAt: new Date('2026-04-24T00:00:00.000Z'),
    });
  });

  it('prevents duplicate active wallet addresses during create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(service.create('GABC123')).rejects.toThrow(ConflictException);
  });
});
