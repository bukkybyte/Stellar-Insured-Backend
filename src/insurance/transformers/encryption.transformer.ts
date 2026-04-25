import { ValueTransformer } from 'typeorm';
import { EncryptionService } from '../../encryption/encryption.service';

/**
 * TypeORM Value Transformer for encrypting/decrypting decimal fields
 * Used for sensitive financial data like premiums, coverage amounts, claim amounts, etc.
 */
export class EncryptionTransformer implements ValueTransformer {
  private encryptionService: EncryptionService;

  constructor(encryptionService: EncryptionService) {
    this.encryptionService = encryptionService;
  }

  /**
   * Transform value from database to application
   * Decrypt the encrypted value
   */
  from(value: string | null): number | null {
    if (!value) {
      return null;
    }
    try {
      const decrypted = this.encryptionService.decrypt(value);
      return parseFloat(decrypted);
    } catch (error) {
      // If decryption fails, try parsing as regular number (for backward compatibility)
      return parseFloat(value);
    }
  }

  /**
   * Transform value from application to database
   * Encrypt the number value
   */
  to(value: number | null): string | null {
    if (!value) {
      return null;
    }
    return this.encryptionService.encrypt(value.toString());
  }
}

/**
 * Factory function to create encryption transformer
 * This allows us to inject the EncryptionService
 */
export function createEncryptionTransformer(
  encryptionService: EncryptionService,
): ValueTransformer {
  return new EncryptionTransformer(encryptionService);
}
