import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import { UserParamsDto } from './dto/user-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 users list requests per minute
  @Get()
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.userService.findPaginated(page, limit);
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 user lookups per minute
  @Get(':id')
  async getUser(@Param() params: UserParamsDto) {
    const user = await this.userService.findById(params.id);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 wallet lookups per minute
  @Get('wallet/:address')
  async getUserByWallet(@Param('address') address: string) {
    const user = await this.userService.findByWallet(address);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 updates per hour per user
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(
    @Param() params: UserParamsDto,
    @Body() updateData: UpdateUserDto,
  ) {
    const user = await this.userService.update(params.id, updateData);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 deletions per hour per user
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param() params: UserParamsDto) {
    const result = await this.userService.delete(params.id);
    return {
      success: true,
      ...result,
    };
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      email: user.email,
      profileData: user.profileData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
