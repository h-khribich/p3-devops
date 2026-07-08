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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

type JwtPayload = {
  sub: number;
  email: string;
};

@ApiTags('Fichiers')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lister mes fichiers uploadés' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'active', 'expired'],
    description: 'Filtrer par statut',
  })
  async getMyFiles(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: 'all' | 'active' | 'expired',
  ) {
    return this.storageService.listUserFiles(user.sub, status ?? 'active');
  }

  @Delete('me/:id')
  @ApiOperation({ summary: 'Supprimer un de mes fichiers' })
  async deleteMyFile(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { password?: string },
  ) {
    return this.storageService.deleteUserFile(user.sub, id, body?.password);
  }
}
