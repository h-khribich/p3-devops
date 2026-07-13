import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../src/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  GoneException,
  UnauthorizedException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';

// ============================================================
//  On mocke S3Client au complet pour ne JAMAIS toucher à AWS
// ============================================================
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    HeadBucketCommand: jest.fn(),
  };
});

describe('StorageService', () => {
  let storageService: StorageService;
  let prisma: jest.Mocked<PrismaService>;
  let mockS3Send: jest.Mock;

  // ============================================================
  //  Données fictives réutilisables
  //  Attention : les dates sont relatives à "maintenant"
  //  pour éviter les problèmes d'expiration dans les tests
  // ============================================================

  /**
   * Fichier valide (non expiré) — expireDate dans le futur
   */
  const validFileRecord = {
    id: 1,
    userId: null,
    filename: 'test.pdf',
    s3Key: 'anonymous/token123/test.pdf',
    downloadToken: 'token123',
    type: 'application/pdf',
    size: 1024,
    sendDate: new Date(),
    expireDate: new Date(Date.now() + 100_000), // Dans le futur
    password: null,
    tags: [],
    status: 'uploaded',
  };

  /**
   * Fichier expiré — expireDate dans le passé
   */
  const expiredFileRecord = {
    ...validFileRecord,
    id: 2,
    filename: 'old.pdf',
    expireDate: new Date(Date.now() - 100_000), // Dans le passé
    status: 'uploaded', // Pas encore marqué comme expiré en DB
  };

  const mockValidFile = {
    originalname: 'document.pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf'),
    mimetype: 'application/pdf',
    size: 1024,
  };

  beforeEach(async () => {
    // Reset du mock S3 avant chaque test
    mockS3Send = (new S3Client({}) as any).send as jest.Mock;
    mockS3Send.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: PrismaService,
          useValue: {
            file: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                AWS_REGION: 'eu-west-3',
                AWS_S3_BUCKET: 'mon-bucket',
              };
              return config[key] || null;
            }),
          },
        },
      ],
    }).compile();

    storageService = module.get<StorageService>(StorageService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;

    // Reset des mocks entre chaque test
    jest.clearAllMocks();
  });

  // ============================================================
  //  NOTE : on n'appelle pas onModuleInit() dans les tests
  //  pour éviter le cleanup automatique qui polluerait les tests
  // ============================================================

  // ==================== createAnonymousUpload ====================

  describe('createAnonymousUpload', () => {
    it('devrait uploader un fichier et retourner les infos', async () => {
      // 1. Upload S3 OK
      mockS3Send.mockResolvedValue({});

      // 2. Création DB OK
      (prisma.file.create as jest.Mock).mockResolvedValue({
        ...validFileRecord,
        id: 1,
        filename: 'document.pdf',
        downloadToken: 'abc123',
        expireDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const result = await storageService.createAnonymousUpload(mockValidFile, {
        expirationDays: '3',
      });

      // Vérifie que le fichier a bien été envoyé à S3
      expect(mockS3Send).toHaveBeenCalled();

      // Vérifie la création en base
      expect(prisma.file.create).toHaveBeenCalled();

      // Vérifie le retour
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('downloadToken');
      expect(result.downloadPath).toContain('/download/');
      expect(result).not.toHaveProperty('password');
    });

    it('devrait rejeter un fichier avec extension non autorisée', async () => {
      const badFile = { ...mockValidFile, originalname: 'virus.exe' };

      await expect(
        storageService.createAnonymousUpload(badFile, {}),
      ).rejects.toThrow(BadRequestException);

      // Vérifie que rien n'a été envoyé à S3 ni en DB
      expect(mockS3Send).not.toHaveBeenCalled();
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('devrait rejeter un fichier trop gros (> 1 Go)', async () => {
      const hugeFile = { ...mockValidFile, size: 1024 * 1024 * 1024 + 1 };

      await expect(
        storageService.createAnonymousUpload(hugeFile, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter un mot de passe trop court (< 6 caractères)', async () => {
      await expect(
        storageService.createAnonymousUpload(mockValidFile, {
          password: 'abc',
        }),
      ).rejects.toThrow(BadRequestException);

      // Rien en S3 ni en DB
      expect(mockS3Send).not.toHaveBeenCalled();
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it('devrait rejeter une durée dexpiration invalide (pas un nombre)', async () => {
      await expect(
        storageService.createAnonymousUpload(mockValidFile, {
          expirationDays: 'pas-un-nombre',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter une durée dexpiration > 7 jours', async () => {
      await expect(
        storageService.createAnonymousUpload(mockValidFile, {
          expirationDays: '10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lancer ServiceUnavailableException si S3 refuse lécriture (AccessDenied)', async () => {
      // S3 renvoie une erreur AccessDenied
      mockS3Send.mockRejectedValue(new Error('AccessDenied'));

      await expect(
        storageService.createAnonymousUpload(mockValidFile, {}),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('devrait rollback S3 si la création en DB échoue', async () => {
      // 1. Upload S3 OK
      mockS3Send.mockResolvedValue({});

      // 2. Échec en DB
      (prisma.file.create as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        storageService.createAnonymousUpload(mockValidFile, {}),
      ).rejects.toThrow(InternalServerErrorException);

      // Vérifie que S3 a été appelé 2 fois : upload puis rollback (delete)
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== getDownloadMetadata ====================

  describe('getDownloadMetadata', () => {
    it("devrait retourner les métadonnées d'un fichier valide", async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(validFileRecord);

      const result = await storageService.getDownloadMetadata('token123');

      expect(result.filename).toBe('test.pdf');
      expect(result.expired).toBe(false);
      expect(result.passwordRequired).toBe(false);
    });

    it('devrait lever NotFoundException si le fichier nexiste pas', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        storageService.getDownloadMetadata('token-inconnu'),
      ).rejects.toThrow(NotFoundException);
    });

    it("devrait retourner expired=true si le statut DB est 'expired'", async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue({
        ...validFileRecord,
        status: 'expired',
      });

      const result = await storageService.getDownloadMetadata('token123');

      expect(result.expired).toBe(true);
    });

    it('devrait marquer le fichier comme expiré si la date est dépassée', async () => {
      const expiredFile = {
        ...validFileRecord,
        expireDate: new Date('2024-01-01'), // Date dans le passé
      };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(expiredFile);
      (prisma.file.update as jest.Mock).mockResolvedValue({
        ...expiredFile,
        status: 'expired',
      });

      const result = await storageService.getDownloadMetadata('token123');

      // Vérifie que le fichier a été marqué expiré en DB
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: expiredFile.id },
        data: { status: 'expired' },
      });

      expect(result.expired).toBe(true);
    });
  });

  // ==================== getDownloadStream ====================

  describe('getDownloadStream', () => {
    const { Readable } = require('stream');

    it('devrait retourner un stream pour un fichier valide', async () => {
      // 1. Fichier trouvé en DB
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(validFileRecord);

      // 2. S3 retourne un stream
      mockS3Send.mockResolvedValue({
        Body: Readable.from(Buffer.from('fake content')),
      });

      const result = await storageService.getDownloadStream('token123');

      expect(result.filename).toBe('test.pdf');
      expect(result.stream).toBeDefined();
    });

    it('devrait lever NotFoundException si le fichier nexiste pas', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        storageService.getDownloadStream('token-inconnu'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever GoneException si le fichier est expiré', async () => {
      const expiredFile = {
        ...validFileRecord,
        expireDate: new Date('2024-01-01'),
      };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(expiredFile);
      (prisma.file.update as jest.Mock).mockResolvedValue({
        ...expiredFile,
        status: 'expired',
      });

      await expect(
        storageService.getDownloadStream('token123'),
      ).rejects.toThrow(GoneException);
    });

    it('devrait lever UnauthorizedException si le mot de passe est requis et incorrect', async () => {
      const protectedFile = {
        ...validFileRecord,
        password: 'secret123',
      };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(protectedFile);

      await expect(
        storageService.getDownloadStream('token123', 'mauvais-mot-de-passe'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait accepter le téléchargement si le mot de passe est correct', async () => {
      const protectedFile = {
        ...validFileRecord,
        password: 'secret123',
      };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(protectedFile);
      mockS3Send.mockResolvedValue({
        Body: Readable.from(Buffer.from('fake content')),
      });

      const result = await storageService.getDownloadStream(
        'token123',
        'secret123',
      );

      expect(result.filename).toBe('test.pdf');
    });
  });

  // ==================== listUserFiles ====================

  describe('listUserFiles', () => {
    const activeFile = {
      ...validFileRecord,
      id: 1,
      expireDate: new Date(Date.now() + 100000), // Dans le futur
    };

    const expiredFile = {
      ...validFileRecord,
      id: 2,
      filename: 'old.pdf',
      expireDate: new Date(Date.now() - 100000), // Dans le passé
    };

    it('devrait retourner la liste des fichiers actifs par défaut', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([
        activeFile,
        expiredFile,
      ]);

      const result = await storageService.listUserFiles(1);

      // Par défaut, on filtre "active" → seulement 1 fichier
      expect(result.length).toBe(1);
      expect(result[0].state).toBe('active');
    });

    it('devrait retourner tous les fichiers avec status=all', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([
        activeFile,
        expiredFile,
      ]);

      const result = await storageService.listUserFiles(1, 'all');

      expect(result.length).toBe(2);
    });

    it('devrait retourner seulement les fichiers expirés', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([
        activeFile,
        expiredFile,
      ]);

      const result = await storageService.listUserFiles(1, 'expired');

      expect(result.length).toBe(1);
      expect(result[0].state).toBe('expired');
    });
  });

  // ==================== deleteUserFile ====================

  describe('deleteUserFile', () => {
    it('devrait supprimer un fichier avec succès', async () => {
      (prisma.file.findFirst as jest.Mock).mockResolvedValue(validFileRecord);
      mockS3Send.mockResolvedValue({});

      const result = await storageService.deleteUserFile(1, 1);

      expect(result).toEqual({ success: true });
      expect(prisma.file.delete).toHaveBeenCalledWith({
        where: { id: validFileRecord.id },
      });
    });

    it("devrait lever NotFoundException si le fichier n'appartient pas à l'utilisateur", async () => {
      (prisma.file.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(storageService.deleteUserFile(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devrait lever UnauthorizedException si le mot de passe est incorrect', async () => {
      const protectedFile = {
        ...validFileRecord,
        password: 'secret123',
      };
      (prisma.file.findFirst as jest.Mock).mockResolvedValue(protectedFile);

      await expect(
        storageService.deleteUserFile(1, 1, 'mauvais-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait supprimer même si S3 échoue (best effort)', async () => {
      (prisma.file.findFirst as jest.Mock).mockResolvedValue(validFileRecord);
      // S3 plante
      mockS3Send.mockRejectedValue(new Error('S3 error'));

      const result = await storageService.deleteUserFile(1, 1);

      // La suppression en DB doit quand même avoir lieu
      expect(result).toEqual({ success: true });
      expect(prisma.file.delete).toHaveBeenCalled();
    });
  });

  // ==================== cleanupExpiredFiles ====================

  describe('cleanupExpiredFiles', () => {
    it('devrait nettoyer les fichiers expirés et les marquer en DB', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([
        { id: 1, s3Key: 'expired/key1' },
        { id: 2, s3Key: 'expired/key2' },
      ]);
      mockS3Send.mockResolvedValue({});
      (prisma.file.update as jest.Mock).mockResolvedValue({});

      await storageService.cleanupExpiredFiles();

      // Vérifie que S3 a été appelé pour chaque fichier (delete)
      expect(mockS3Send).toHaveBeenCalledTimes(2);

      // Vérifie que la DB a été mise à jour pour chaque fichier
      expect(prisma.file.update).toHaveBeenCalledTimes(2);
    });

    it('ne devrait rien faire sil ny a pas de fichiers expirés', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);

      await storageService.cleanupExpiredFiles();

      expect(mockS3Send).not.toHaveBeenCalled();
      expect(prisma.file.update).not.toHaveBeenCalled();
    });

    it('ne devrait pas planter si la requête DB échoue', async () => {
      (prisma.file.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      // Ne doit pas lever d'exception
      await expect(
        storageService.cleanupExpiredFiles(),
      ).resolves.toBeUndefined();
    });
  });
});
