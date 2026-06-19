import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  it('rejects invalid user ID format in findById', async () => {
    await expect(service.findById('<script>alert(1)</script>')).rejects.toThrow(BadRequestException);
    await expect(service.findById('DROP TABLE users;')).rejects.toThrow(BadRequestException);
  });

  it('filters soft-deleted users from id lookups', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findById('clabcdefghij')).rejects.toThrow(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'clabcdefghij',
        deletedAt: null,
      },
    });
  });

  it('rejects invalid wallet address format in findByWallet', async () => {
    await expect(service.findByWallet('<script>evil()</script>')).rejects.toThrow(BadRequestException);
    await expect(service.findByWallet("'; DROP TABLE users;--")).rejects.toThrow(BadRequestException);
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
      id: 'clabcdefghij',
      walletAddress: 'encrypted:GABC123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({
      id: 'clabcdefghij',
      deletedAt: new Date('2026-04-24T00:00:00.000Z'),
    });

    const result = await service.delete('clabcdefghij');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'clabcdefghij' },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      id: 'clabcdefghij',
      deletedAt: new Date('2026-04-24T00:00:00.000Z'),
    });
  });

  it('rejects invalid wallet address format in create', async () => {
    await expect(service.create('<script>evil()</script>')).rejects.toThrow(BadRequestException);
  });

  it('prevents duplicate active wallet addresses during create', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(service.create('GABC123')).rejects.toThrow(ConflictException);
  });
});
