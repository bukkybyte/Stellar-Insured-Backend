import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StorageService } from './storage.service';
import { PinMetadataDto } from './dto/pin-metadata.dto';
import { OptimizeImageDto } from './dto/optimize-image.dto';
import { VerifyHashDto } from './dto/verify-hash.dto';

@Controller({ path: 'storage', version: '1' })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 metadata pins per hour
  @Post('metadata')
  async pinProjectMetadata(@Body() dto: PinMetadataDto): Promise<string> {
    return this.storageService.pinProjectMetadata(dto.metadata);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 banner uploads per hour
  @Post('banner')
  async optimizeAndUploadBanner(@Body() dto: OptimizeImageDto): Promise<string> {
    const optimizedImage = await this.storageService.optimizeImage(
      dto.imagePath,
      dto.width,
      dto.height,
    );
    const cid = await this.storageService.pinProjectMetadata({
      image: optimizedImage.toString('base64'),
    });
    return cid;
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 hash verifications per minute
  @Post('verify-hash')
  async verifyIPFSHash(@Body() dto: VerifyHashDto): Promise<boolean> {
    return this.storageService.verifyIPFSHash(dto.hash);
  }
}
