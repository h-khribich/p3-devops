import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer, { type StorageEngine } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';

type UploadFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

type JwtPayload = {
  sub: number;
  email: string;
};

@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage() as StorageEngine,
      limits: { fileSize: 1024 * 1024 * 1024 },
    }),
  )
  async uploadMyFile(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: UploadFile | undefined,
    @Body('password') password?: string,
    @Body('expirationDays') expirationDays?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Veuillez sélectionner un fichier.');
    }

    return this.storageService.createUserUpload(user.sub, file, {
      password,
      expirationDays,
    });
  }

  @Post('anonymous')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage() as StorageEngine,
      limits: { fileSize: 1024 * 1024 * 1024 },
    }),
  )
  async uploadAnonymousFile(
    @UploadedFile() file: UploadFile | undefined,
    @Body('password') password?: string,
    @Body('expirationDays') expirationDays?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Veuillez sélectionner un fichier.');
    }

    return this.storageService.createAnonymousUpload(file, {
      password,
      expirationDays,
    });
  }
}
