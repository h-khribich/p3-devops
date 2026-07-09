import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../src/storage/storage.service';
import { AppService } from '../../src/app.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

/**
  Stratégie:  mock de PrismaService, StorageService (qui dépend de S3),
  et AppService (qui dépend de S3 + DB réelle) pour tester
  UNIQUEMENT la couche HTTP : contrôleurs, guards, pipes, DTOs.
 
  Pour tests rapides et fiables.
 */

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

/** Stockage global du token généré pendant les tests */
let authToken: string;

/** Mock du StorageService pour éviter tout appel à S3 */
const mockStorageService = {
  createAnonymousUpload: jest.fn(),
  createUserUpload: jest.fn(),
  getDownloadMetadata: jest.fn(),
  getDownloadStream: jest.fn(),
  listUserFiles: jest.fn(),
  deleteUserFile: jest.fn(),
};

/** Mock du PrismaService */
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  file: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
};

/** Mock du AppService (évite l'appel à S3 pour /status) */
const mockAppService = {
  getHello: jest.fn().mockReturnValue('Hello World!'),
  getReadiness: jest.fn().mockResolvedValue({
    status: 'ready',
    dependencies: { database: true, s3: true },
    timestamp: new Date().toISOString(),
  }),
};

describe('API Endpoints', () => {
  let app: INestApplication;
  let prisma: jest.Mocked<PrismaService>;
  let storageService: jest.Mocked<StorageService>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .overrideProvider(AppService)
      .useValue(mockAppService)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    storageService = module.get(StorageService) as jest.Mocked<StorageService>;
    jwtService = module.get(JwtService);

    // Génération d'un vrai token JWT pour les tests authentifiés
    authToken = jwtService.sign({ sub: 1, email: 'test@test.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  //  POST /auth/register
  // ====================================================================
  describe('POST /auth/register', () => {
    const validUser = { email: 'new@test.com', password: 'password123' };

    it('201 - devrait créer un utilisateur', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'new@test.com',
        password: 'hashedPassword',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body).toEqual({
        id: 2,
        email: 'new@test.com',
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('400 - email invalide', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'pas-un-email', password: 'password123' })
        .expect(400);

      expect(res.body.message[0]).toContain('invalide');
    });

    it('400 - mot de passe trop court (< 8 char)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@test.com', password: '123' })
        .expect(400);

      expect(res.body.message[0]).toContain('8 caractères');
    });

    it('409 - email déjà utilisé', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'existing@test.com',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'existing@test.com', password: 'password123' })
        .expect(409);

      expect(res.body.message).toContain('déjà utilisé');
    });
  });

  // ====================================================================
  //  POST /auth/login
  // ====================================================================
  describe('POST /auth/login', () => {
    const credentials = { email: 'test@test.com', password: 'correct' };

    it('200 - devrait retourner un token JWT', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user).toEqual({ id: 1, email: 'test@test.com' });
    });

    it('401 - identifiants invalides', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(res.body.message).toContain('Identifiants invalides');
    });

    it('401 - mauvais mot de passe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(res.body.message).toContain('Identifiants invalides');
    });

    it('400 - email manquant', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'test1234' })
        .expect(400);
    });
  });

  // ====================================================================
  //  POST /uploads/anonymous
  // ====================================================================
  describe('POST /uploads/anonymous', () => {
    it('201 - devrait uploader un fichier anonyme', async () => {
      (storageService.createAnonymousUpload as jest.Mock).mockResolvedValue({
        id: 1,
        filename: 'test.pdf',
        size: 1024,
        expirationDays: 7,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        downloadToken: 'token123',
        downloadPath: '/download/token123',
      });

      const res = await request(app.getHttpServer())
        .post('/uploads/anonymous')
        .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), 'test.pdf')
        .field('expirationDays', '3')
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('downloadToken');
      expect(res.body.downloadPath).toContain('/download/');
    });

    it('400 - sans fichier', async () => {
      const res = await request(app.getHttpServer())
        .post('/uploads/anonymous')
        .expect(400);

      expect(res.body.message).toContain('fichier');
    });

    it('400 - extension non autorisée', async () => {
      (storageService.createAnonymousUpload as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').BadRequestException)(
          'Type non autorisé. Extensions autorisées : jpg, jpeg, png, pdf, doc',
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/uploads/anonymous')
        .attach('file', Buffer.from('malicious code'), 'virus.exe')
        .expect(400);
    });
  });

  // ====================================================================
  //  POST /downloads/:token/file  (téléchargement)
  // ====================================================================
  describe('POST /downloads/:token/file', () => {
    it('200 - devrait télécharger un fichier', async () => {
      // Simule un Readable stream (ce que retournerait S3)
      const { Readable } = require('stream');
      (storageService.getDownloadStream as jest.Mock).mockResolvedValue({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        stream: Readable.from(Buffer.from('fake pdf content')),
      });

      const res = await request(app.getHttpServer())
        .post('/downloads/token123/file')
        .expect(200); // @HttpCode(HttpStatus.OK)

      expect(res.headers['content-type']).toContain('application/octet-stream');
    });

    it('404 - token inexistant', async () => {
      (storageService.getDownloadStream as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').NotFoundException)(
          'Fichier introuvable.',
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/downloads/invalid-token/file')
        .expect(404);

      expect(res.body.message).toContain('introuvable');
    });

    it('410 - fichier expiré', async () => {
      (storageService.getDownloadStream as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').GoneException)('Ce fichier a expiré.'),
      );

      const res = await request(app.getHttpServer())
        .post('/downloads/token456/file')
        .expect(410);

      expect(res.body.message).toContain('expiré');
    });

    it('401 - mot de passe requis et invalide', async () => {
      (storageService.getDownloadStream as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').UnauthorizedException)(
          'Mot de passe invalide.',
        ),
      );

      const res = await request(app.getHttpServer())
        .post('/downloads/token789/file')
        .send({ password: 'wrongpass' })
        .expect(401);

      expect(res.body.message).toContain('invalide');
    });
  });

  // ====================================================================
  //  GET /downloads/:token  (metadata)
  // ====================================================================
  describe('GET /downloads/:token', () => {
    it('200 - devrait retourner les métadonnées', async () => {
      (storageService.getDownloadMetadata as jest.Mock).mockResolvedValue({
        filename: 'test.pdf',
        size: 1024,
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        passwordRequired: false,
        expired: false,
      });

      const res = await request(app.getHttpServer())
        .get('/downloads/token123')
        .expect(200);

      expect(res.body.filename).toBe('test.pdf');
      expect(res.body.expired).toBe(false);
    });

    it('404 - token inexistant', async () => {
      (storageService.getDownloadMetadata as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').NotFoundException)(
          'Fichier introuvable.',
        ),
      );

      await request(app.getHttpServer()).get('/downloads/nope').expect(404);
    });
  });

  // ====================================================================
  //  GET /files/me  (liste des fichiers de l'utilisateur)
  // ====================================================================
  describe('GET /files/me', () => {
    it('200 - devrait lister les fichiers (authentifié)', async () => {
      (storageService.listUserFiles as jest.Mock).mockResolvedValue([
        {
          id: 1,
          filename: 'doc.pdf',
          size: 500,
          sendDate: new Date(),
          expireDate: new Date(Date.now() + 100000),
          state: 'active',
          downloadPath: '/download/tok1',
          passwordRequired: false,
        },
        {
          id: 2,
          filename: 'old.pdf',
          size: 200,
          sendDate: new Date(),
          expireDate: new Date(Date.now() - 100000),
          state: 'expired',
          downloadPath: '/download/tok2',
          passwordRequired: false,
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/files/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('401 - sans token', async () => {
      const res = await request(app.getHttpServer())
        .get('/files/me')
        .expect(401);

      expect(res.body.message).toContain('Token manquant');
    });

    it('401 - token invalide', async () => {
      const res = await request(app.getHttpServer())
        .get('/files/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.message).toContain('Token invalide');
    });

    it('200 - devrait filtrer par status=all', async () => {
      (storageService.listUserFiles as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/files/me?status=all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // ====================================================================
  //  DELETE /files/me/:id
  // ====================================================================
  describe('DELETE /files/me/:id', () => {
    it('200 - devrait supprimer un fichier', async () => {
      (storageService.deleteUserFile as jest.Mock).mockResolvedValue({
        success: true,
      });

      const res = await request(app.getHttpServer())
        .delete('/files/me/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual({ success: true });
    });

    it('404 - fichier inexistant', async () => {
      (storageService.deleteUserFile as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').NotFoundException)(
          'Fichier introuvable.',
        ),
      );

      const res = await request(app.getHttpServer())
        .delete('/files/me/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.message).toContain('introuvable');
    });

    it('401 - sans token', async () => {
      await request(app.getHttpServer()).delete('/files/me/1').expect(401);
    });

    it('200 - avec mot de passe correct', async () => {
      (storageService.deleteUserFile as jest.Mock).mockResolvedValue({
        success: true,
      });

      await request(app.getHttpServer())
        .delete('/files/me/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'secret123' })
        .expect(200);
    });

    it('401 - avec mauvais mot de passe', async () => {
      (storageService.deleteUserFile as jest.Mock).mockRejectedValue(
        new (require('@nestjs/common').UnauthorizedException)(
          'Mot de passe invalide.',
        ),
      );

      const res = await request(app.getHttpServer())
        .delete('/files/me/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'wrong' })
        .expect(401);

      expect(res.body.message).toContain('invalide');
    });
  });
});
