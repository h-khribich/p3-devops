import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('downloads')
export class DownloadController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':token')
  async getDownloadMetadata(@Param('token') token: string) {
    return this.storageService.getDownloadMetadata(token);
  }

  @Post(':token/file')
  @Header('Content-Type', 'application/octet-stream')
  async downloadFile(
    @Param('token') token: string,
    @Body('password') password?: string,
  ) {
    const file = await this.storageService.getDownloadStream(token, password);

    return new StreamableFile(file.stream, {
      type: file.mimetype,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
