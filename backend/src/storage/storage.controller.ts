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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import multer from 'multer';
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

@ApiTags('Uploads')
@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Uploader un fichier (utilisateur connecté)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader',
        },
        password: {
          type: 'string',
          description: 'Mot de passe optionnel pour protéger le fichier',
        },
        expirationDays: {
          type: 'string',
          description: 'Nombre de jours avant expiration (optionnel)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
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
  @ApiOperation({ summary: 'Uploader un fichier (anonyme)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader',
        },
        password: {
          type: 'string',
          description: 'Mot de passe optionnel pour protéger le fichier',
        },
        expirationDays: {
          type: 'string',
          description: 'Nombre de jours avant expiration (optionnel)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
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
