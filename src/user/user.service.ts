import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { EncryptionService } from '../encryption/encryption.service';
import { sanitizeString, sanitizeObject, isValidCuid, isValidWalletAddress } from '../common/utils/sanitization.util';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(id: string) {
    // Validate ID format before querying database
    if (!isValidCuid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

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
    // Validate wallet address format before querying database
    if (!isValidWalletAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    const sanitizedAddress = sanitizeString(walletAddress);

    const user = await this.prisma.user.findFirst({
      where: {
        walletAddress: sanitizedAddress,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with wallet address ${sanitizedAddress} not found`);
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
    // Validate wallet address format
    if (!isValidWalletAddress(walletAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    const sanitizedAddress = sanitizeString(walletAddress);

    // Check if user exists (wallet address is public identifier, not encrypted)
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress: sanitizedAddress },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    // Encrypt email for privacy
    const sanitizedEmail = email ? sanitizeString(email) : null;
    const encryptedEmail = sanitizedEmail ? this.encryption.encrypt(sanitizedEmail) : null;

    return this.prisma.user.create({
      data: {
        walletAddress: sanitizedAddress, // Keep as-is for unique constraint and public lookup
        email: encryptedEmail,
      },
    });
  }

  async update(id: string, updateData: UpdateUserDto) {
    // Validate ID format
    if (!isValidCuid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    await this.findById(id); // Ensure user exists

    // Build sanitized update payload with explicit property selection
    // This prevents mass assignment by only allowing known safe fields
    const data: Record<string, unknown> = {};

    if (updateData.email !== undefined) {
      data.email = this.encryption.encrypt(sanitizeString(updateData.email));
    }

    if (updateData.profileData !== undefined) {
      // profileData is already validated by DTO (ProfileDataDto)
      // Apply an additional sanitization pass for defense-in-depth
      data.profileData = sanitizeObject(updateData.profileData);
    }

    if (updateData.pushSubscription !== undefined) {
      data.pushSubscription = this.encryption.encrypt(sanitizeString(updateData.pushSubscription));
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
  private decryptUser(user: User) {
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
