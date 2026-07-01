import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

type JwtPayload = {
  sub: number;
  email: string;
};

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get('me')
  async getMyFiles(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: 'all' | 'active' | 'expired',
  ) {
    return this.storageService.listUserFiles(user.sub, status ?? 'active');
  }

  @Delete('me/:id')
  async deleteMyFile(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { password?: string },
  ) {
    return this.storageService.deleteUserFile(user.sub, id, body?.password);
  }
}
