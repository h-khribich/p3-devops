import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getReadiness() {
    const dependencies = {
      database: false,
      s3: false,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dependencies.database = true;
    } catch {
      dependencies.database = false;
    }

    const region = this.configService.get<string>('AWS_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');

    if (region && bucketName) {
      try {
        const s3Client = new S3Client({ region });
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        dependencies.s3 = true;
      } catch {
        dependencies.s3 = false;
      }
    }

    const ready = dependencies.database && dependencies.s3;

    if (!ready) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        dependencies,
      });
    }

    return {
      status: 'ready',
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }
}
