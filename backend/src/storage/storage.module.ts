import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DownloadController } from './download.controller';
import { FilesController } from './files.controller';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StorageController, DownloadController, FilesController],
  providers: [StorageService],
})
export class StorageModule {}
