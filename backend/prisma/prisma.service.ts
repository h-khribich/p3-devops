// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // OnModuleInit est appelé automatiquement quand le module démarre
  async onModuleInit() {
    // $connect() ouvre la connexion à la BDD
    await this.$connect();
  }

  // OnModuleDestroy est appelé automatiquement quand l'application s'arrête
  async onModuleDestroy() {
    // $disconnect() ferme proprement la connexion
    await this.$disconnect();
  }
}
