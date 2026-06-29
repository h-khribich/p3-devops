import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer, { type StorageEngine } from 'multer';
import { StorageService } from './storage.service';

type UploadFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

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
