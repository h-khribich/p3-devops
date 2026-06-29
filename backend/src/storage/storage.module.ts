import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DownloadController } from './download.controller';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [StorageController, DownloadController],
  providers: [StorageService],
})
export class StorageModule {}
