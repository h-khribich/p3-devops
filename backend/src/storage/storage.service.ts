import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  GoneException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Readable } from 'node:stream';

type UploadFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const MAX_FILE_SIZE = 1024 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'doc'];
const MAX_EXPIRATION_DAYS = 7;

type AnonymousUploadInput = {
  password?: string;
  expirationDays?: string;
};

type DownloadMetadata = {
  filename: string;
  size: number;
  expiresAt: string;
  passwordRequired: boolean;
  expired: boolean;
};

type UserFileStatus = 'all' | 'active' | 'expired';

type UserFileItem = {
  id: number;
  filename: string;
  size: number;
  sendDate: string;
  expireDate: string;
  state: 'active' | 'expired';
  downloadPath: string;
  passwordRequired: boolean;
};

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cleanupIntervalMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const region = configService.get<string>('AWS_REGION');
    const bucketName = configService.get<string>('AWS_S3_BUCKET');

    if (!region || !bucketName) {
      throw new InternalServerErrorException('Configuration AWS incomplète.');
    }

    this.bucketName = bucketName;

    const s3Config: Record<string, unknown> = { region };

    // Support MinIO / S3-compatible local (endpoint + path-style)
    const endpoint = configService.get<string>('AWS_ENDPOINT');
    const forcePathStyle = configService.get<string>('AWS_FORCE_PATH_STYLE');
    const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (endpoint) {
      s3Config.endpoint = endpoint;
    }
    if (forcePathStyle === 'true') {
      s3Config.forcePathStyle = true;
    }
    if (accessKeyId && secretAccessKey) {
      s3Config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.s3Client = new S3Client(s3Config);
    this.cleanupIntervalMs = 60_000;
  }

  async onModuleInit() {
    try {
      await this.cleanupExpiredFiles();
    } catch {
      // If the database is temporarily unavailable, the app should still start.
    }

    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredFiles();
    }, this.cleanupIntervalMs);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async createAnonymousUpload(file: UploadFile, input: AnonymousUploadInput) {
    return this.createUploadForUser(null, file, input);
  }

  async createUserUpload(
    userId: number,
    file: UploadFile,
    input: AnonymousUploadInput,
  ) {
    return this.createUploadForUser(userId, file, input);
  }

  private async createUploadForUser(
    userId: number | null,
    file: UploadFile,
    input: AnonymousUploadInput,
  ) {
    this.validateFile(file);

    const password = input.password?.trim();
    if (password && password.length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 6 caractères.',
      );
    }

    const expirationDays = this.parseExpirationDays(input.expirationDays);
    const downloadToken = randomUUID().replace(/-/g, '');
    const fileName = this.sanitizeFileName(file.originalname);
    const s3Key = `anonymous/${downloadToken}/${fileName}`;
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expirationDays);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue S3.';

      if (message.includes('AccessDenied')) {
        throw new ServiceUnavailableException(
          `S3 refuse l'écriture sur le bucket ${this.bucketName}. Vérifie la policy IAM du compte utilisé par le backend.`,
        );
      }

      throw new InternalServerErrorException(
        `Impossible d'envoyer le fichier sur S3: ${message}`,
      );
    }

    type CreatedFile = Awaited<ReturnType<typeof this.prisma.file.create>>;
    let createdFile: CreatedFile;

    try {
      createdFile = await this.prisma.file.create({
        data: {
          userId,
          filename: file.originalname,
          s3Key,
          downloadToken,
          type: file.mimetype,
          size: file.size,
          expireDate,
          password: password || null,
          tags: [],
          status: 'uploaded',
        },
      });
    } catch {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
          }),
        );
      } catch {
        // Ignore rollback errors; the main failure is the database insert.
      }

      throw new InternalServerErrorException(
        'Le fichier a bien été envoyé sur S3 mais la sauvegarde en base a échoué.',
      );
    }

    return {
      id: createdFile.id,
      filename: createdFile.filename,
      size: createdFile.size,
      expirationDays,
      expiresAt: createdFile.expireDate,
      downloadToken,
      downloadPath: `/download/${downloadToken}`,
    };
  }

  async getDownloadMetadata(downloadToken: string): Promise<DownloadMetadata> {
    const file = await this.prisma.file.findUnique({
      where: { downloadToken },
    });

    if (!file) {
      throw new NotFoundException('Fichier introuvable.');
    }

    if (file.status === 'expired') {
      return {
        filename: file.filename,
        size: file.size,
        expiresAt: file.expireDate.toISOString(),
        passwordRequired: Boolean(file.password),
        expired: true,
      };
    }

    if (file.expireDate.getTime() <= Date.now()) {
      await this.expireFile(file.id, file.s3Key);

      return {
        filename: file.filename,
        size: file.size,
        expiresAt: file.expireDate.toISOString(),
        passwordRequired: Boolean(file.password),
        expired: true,
      };
    }

    return {
      filename: file.filename,
      size: file.size,
      expiresAt: file.expireDate.toISOString(),
      passwordRequired: Boolean(file.password),
      expired: false,
    };
  }

  async getDownloadStream(downloadToken: string, password?: string) {
    const file = await this.findFileByToken(downloadToken);

    if (file.password && file.password !== (password ?? '').trim()) {
      throw new UnauthorizedException('Mot de passe invalide.');
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: file.s3Key,
      }),
    );

    const body = response.Body;
    if (!body || typeof (body as Readable).pipe !== 'function') {
      throw new InternalServerErrorException(
        'Impossible de lire le fichier depuis S3.',
      );
    }

    return {
      filename: file.filename,
      mimetype: file.type,
      stream: body as Readable,
    };
  }

  async listUserFiles(
    userId: number,
    status: UserFileStatus = 'active',
  ): Promise<UserFileItem[]> {
    const files = await this.prisma.file.findMany({
      where: { userId },
      orderBy: { sendDate: 'desc' },
    });

    const mappedFiles: UserFileItem[] = files.map((file) => {
      const isExpired =
        file.status === 'expired' || file.expireDate.getTime() <= Date.now();
      const state: UserFileItem['state'] = isExpired ? 'expired' : 'active';

      return {
        id: file.id,
        filename: file.filename,
        size: file.size,
        sendDate: file.sendDate.toISOString(),
        expireDate: file.expireDate.toISOString(),
        state,
        downloadPath: `/download/${file.downloadToken}`,
        passwordRequired: Boolean(file.password),
      };
    });

    if (status === 'all') {
      return mappedFiles;
    }

    return mappedFiles.filter((file) => file.state === status);
  }

  async deleteUserFile(userId: number, fileId: number, password?: string) {
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      throw new NotFoundException('Fichier introuvable.');
    }

    if (file.password && file.password !== (password ?? '').trim()) {
      throw new UnauthorizedException('Mot de passe invalide.');
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: file.s3Key,
        }),
      );
    } catch {
      // Best effort: metadata deletion should still proceed.
    }

    await this.prisma.file.delete({
      where: { id: file.id },
    });

    return { success: true };
  }

  async cleanupExpiredFiles() {
    let expiredFiles: { id: number; s3Key: string }[] = [];

    try {
      expiredFiles = await this.prisma.file.findMany({
        where: {
          status: {
            not: 'expired',
          },
          expireDate: {
            lte: new Date(),
          },
        },
        select: {
          id: true,
          s3Key: true,
        },
      });
    } catch {
      return;
    }

    for (const file of expiredFiles) {
      try {
        await this.expireFile(file.id, file.s3Key);
      } catch {
        // We keep retrying on the next interval if S3 deletion or DB update fails.
      }
    }
  }

  private async findFileByToken(downloadToken: string) {
    const file = await this.prisma.file.findUnique({
      where: { downloadToken },
    });

    if (!file) {
      throw new NotFoundException('Fichier introuvable.');
    }

    if (file.status === 'expired' || file.expireDate.getTime() <= Date.now()) {
      await this.expireFile(file.id, file.s3Key);
      throw new GoneException('Ce fichier a expiré.');
    }

    return file;
  }

  private async expireFile(fileId: number, s3Key: string) {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        }),
      );
    } catch {
      // Best effort: even if S3 deletion fails, the file is considered expired in DB.
    }

    await this.prisma.file.update({
      where: { id: fileId },
      data: { status: 'expired' },
    });
  }

  private validateFile(file: UploadFile) {
    const extension = extname(file.originalname).replace('.', '').toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `Type non autorisé. Extensions autorisées : ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Le fichier dépasse la limite de 1 Go.');
    }
  }

  private parseExpirationDays(expirationDays?: string) {
    if (!expirationDays) {
      return MAX_EXPIRATION_DAYS;
    }

    const parsedDays = Number(expirationDays);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      throw new BadRequestException(
        "La durée d'expiration doit être un nombre valide.",
      );
    }

    if (parsedDays > MAX_EXPIRATION_DAYS) {
      throw new BadRequestException('La durée maximale est de 7 jours.');
    }

    return parsedDays;
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
