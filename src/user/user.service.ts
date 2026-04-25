import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Decrypt sensitive fields
    return this.decryptUser(user);
  }

  async findByWallet(walletAddress: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        walletAddress,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with wallet address ${walletAddress} not found`);
    }
    // Decrypt sensitive fields
    return this.decryptUser(user);
  }

  async findPaginated(page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const offset = Math.max(page - 1, 0) * safeLimit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip: offset,
        take: safeLimit,
      }),
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
    ]);

    return {
      data: users.map((user) => this.decryptUser(user)),
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.max(Math.ceil(total / safeLimit), 1),
      },
    };
  }

  async create(walletAddress: string, email?: string) {
    // Check if user exists (wallet address is public identifier, not encrypted)
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    // Encrypt email for privacy
    const encryptedEmail = email ? this.encryption.encrypt(email) : null;

    return this.prisma.user.create({
      data: {
        walletAddress, // Keep as-is for unique constraint and public lookup
        email: encryptedEmail,
      },
    });
  }

  async update(id: string, updateData: UpdateUserDto) {
    await this.findById(id); // Ensure user exists

    // Encrypt sensitive fields if they're being updated
    const data: any = { ...updateData };
    if (data.walletAddress) {
      data.walletAddress = this.encryption.encrypt(data.walletAddress);
    }
    if (data.email) {
      data.email = this.encryption.encrypt(data.email);
    }
    if (data.pushSubscription) {
      data.pushSubscription = this.encryption.encrypt(JSON.stringify(data.pushSubscription));
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return {
      id: deletedUser.id,
      deletedAt: deletedUser.deletedAt,
    };
  }

  /**
   * Decrypt sensitive fields in user object
   */
  private decryptUser(user: any) {
    const decrypted = { ...user };
    
    if (decrypted.walletAddress) {
      try {
        decrypted.walletAddress = this.encryption.decrypt(decrypted.walletAddress);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    if (decrypted.email) {
      try {
        decrypted.email = this.encryption.decrypt(decrypted.email);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    if (decrypted.pushSubscription) {
      try {
        const decryptedJson = this.encryption.decrypt(decrypted.pushSubscription as string);
        decrypted.pushSubscription = JSON.parse(decryptedJson);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    return decrypted;
  }
}
