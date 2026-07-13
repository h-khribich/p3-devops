import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { StorageController } from '../../src/storage/storage.controller';
import { StorageService } from '../../src/storage/storage.service';
import { DownloadController } from '../../src/storage/download.controller';
import { FilesController } from '../../src/storage/files.controller';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';

// ============================================================
//  Tests unitaires des contrôleurs
//  On mocke uniquement les services appelés par les contrôleurs
//  pour tester les décorateurs, les pipes, et les appels.
//
//  Pour les contrôleurs qui utilisent @UseGuards(JwtAuthGuard),
//  on override le guard pour qu'il laisse toujours passer.
// ============================================================

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('devrait appeler authService.register et retourner le résultat', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const expected = { id: 1, email: 'test@test.com' };

      (authService.register as jest.Mock).mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('devrait appeler authService.login et retourner le résultat', async () => {
      const dto = { email: 'test@test.com', password: 'password123' };
      const expected = {
        access_token: 'token',
        user: { id: 1, email: 'test@test.com' },
      };

      (authService.login as jest.Mock).mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});

// ============================================================
describe('StorageController', () => {
  let controller: StorageController;
  let storageService: jest.Mocked<StorageService>;

  const mockUser = { sub: 1, email: 'test@test.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            createUserUpload: jest.fn(),
            createAnonymousUpload: jest.fn(),
          },
        },
      ],
    })
      // JwtAuthGuard est utilisé sur uploadMyFile → on le neutralise
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StorageController>(StorageController);
    storageService = module.get(StorageService) as jest.Mocked<StorageService>;

    jest.clearAllMocks();
  });

  describe('uploadMyFile', () => {
    it('devrait appeler createUserUpload avec les bons paramètres', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 100,
      };
      const expected = { id: 1, filename: 'test.pdf' };

      (storageService.createUserUpload as jest.Mock).mockResolvedValue(
        expected,
      );

      const result = await controller.uploadMyFile(
        mockUser as any,
        file as any,
        'secret123',
        '3',
      );

      expect(storageService.createUserUpload).toHaveBeenCalledWith(
        mockUser.sub,
        file,
        { password: 'secret123', expirationDays: '3' },
      );
      expect(result).toEqual(expected);
    });

    it("devrait lever BadRequestException si aucun fichier n'est fourni", async () => {
      await expect(
        controller.uploadMyFile(
          mockUser as any,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadAnonymousFile', () => {
    it('devrait appeler createAnonymousUpload avec les bons paramètres', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 100,
      };
      const expected = { id: 1, filename: 'test.pdf' };

      (storageService.createAnonymousUpload as jest.Mock).mockResolvedValue(
        expected,
      );

      const result = await controller.uploadAnonymousFile(
        file as any,
        undefined,
        undefined,
      );

      expect(storageService.createAnonymousUpload).toHaveBeenCalledWith(file, {
        password: undefined,
        expirationDays: undefined,
      });
      expect(result).toEqual(expected);
    });

    it("devrait lever BadRequestException si aucun fichier n'est fourni", async () => {
      await expect(
        controller.uploadAnonymousFile(undefined, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

// ============================================================
describe('DownloadController', () => {
  let controller: DownloadController;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            getDownloadMetadata: jest.fn(),
            getDownloadStream: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DownloadController>(DownloadController);
    storageService = module.get(StorageService) as jest.Mocked<StorageService>;

    jest.clearAllMocks();
  });

  describe('getDownloadMetadata', () => {
    it('devrait appeler storageService.getDownloadMetadata avec le token', async () => {
      const expected = { filename: 'test.pdf', expired: false };
      (storageService.getDownloadMetadata as jest.Mock).mockResolvedValue(
        expected,
      );

      const result = await controller.getDownloadMetadata('token123');

      expect(storageService.getDownloadMetadata).toHaveBeenCalledWith(
        'token123',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('downloadFile', () => {
    it('devrait retourner un StreamableFile', async () => {
      const { Readable } = require('stream');
      const mockStream = Readable.from(Buffer.from('test'));

      (storageService.getDownloadStream as jest.Mock).mockResolvedValue({
        filename: 'test.pdf',
        mimetype: 'application/pdf',
        stream: mockStream,
      });

      const result = await controller.downloadFile('token123', 'password');

      expect(storageService.getDownloadStream).toHaveBeenCalledWith(
        'token123',
        'password',
      );
      expect(result).toBeDefined();
    });
  });
});

// ============================================================
describe('FilesController', () => {
  let controller: FilesController;
  let storageService: jest.Mocked<StorageService>;

  const mockUser = { sub: 1, email: 'test@test.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            listUserFiles: jest.fn(),
            deleteUserFile: jest.fn(),
          },
        },
      ],
    })
      // JwtAuthGuard est utilisé au niveau du controller → on le neutralise
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FilesController>(FilesController);
    storageService = module.get(StorageService) as jest.Mocked<StorageService>;

    jest.clearAllMocks();
  });

  describe('getMyFiles', () => {
    it('devrait lister les fichiers (status par défaut = active)', async () => {
      const expected = [{ id: 1, filename: 'test.pdf', state: 'active' }];
      (storageService.listUserFiles as jest.Mock).mockResolvedValue(expected);

      const result = await controller.getMyFiles(mockUser as any, undefined);

      expect(storageService.listUserFiles).toHaveBeenCalledWith(
        mockUser.sub,
        'active',
      );
      expect(result).toEqual(expected);
    });

    it('devrait lister les fichiers avec un filtre status personnalisé', async () => {
      await controller.getMyFiles(mockUser as any, 'all');

      expect(storageService.listUserFiles).toHaveBeenCalledWith(
        mockUser.sub,
        'all',
      );
    });
  });

  describe('deleteMyFile', () => {
    it('devrait supprimer un fichier avec les bons paramètres', async () => {
      (storageService.deleteUserFile as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await controller.deleteMyFile(mockUser as any, 1, {
        password: 'secret',
      });

      expect(storageService.deleteUserFile).toHaveBeenCalledWith(
        mockUser.sub,
        1,
        'secret',
      );
      expect(result).toEqual({ success: true });
    });

    it('devrait supprimer un fichier sans mot de passe', async () => {
      (storageService.deleteUserFile as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await controller.deleteMyFile(
        mockUser as any,
        1,
        undefined,
      );

      expect(storageService.deleteUserFile).toHaveBeenCalledWith(
        mockUser.sub,
        1,
        undefined,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
