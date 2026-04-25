import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NonceService } from './nonce.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * NonceController
 *
 * Exposes a single public endpoint that clients call to obtain a fresh nonce
 * before performing sensitive operations (e.g. wallet-signed authentication).
 *
 * POST /nonce  →  { nonce: string, expiresInMs: number }
 *
 * The nonce is stored in Redis with a 5-minute TTL and consumed (deleted) by
 * NonceService.consumeNonce() inside the relevant auth guard / strategy.
 */
@Controller({ path: 'nonce', version: '1' })
export class NonceController {
  constructor(private readonly nonceService: NonceService) {}

  /**
   * Issue a new one-time nonce.
   * Marked @Public() so it is reachable without a JWT.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async issueNonce(): Promise<{ nonce: string; expiresInMs: number }> {
    const nonce = await this.nonceService.generateNonce();
    return {
      nonce,
      expiresInMs: 5 * 60 * 1000, // must match NONCE_TTL_MS in NonceService
    };
  }
}