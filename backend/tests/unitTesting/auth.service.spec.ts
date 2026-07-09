import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from '../../src/auth/dto/create-user.dto';
import { LoginUserDto } from '../../src/auth/dto/login-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 1,
    email: 'test@test.com',
    password: 'hashedPassword123',
  };

  beforeEach(async () => {
    // On crée un module NestJS avec TOUT mocké sauf AuthService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('fake-jwt-token'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;

    // Reset des mocks entre chaque test
    jest.clearAllMocks();
  });

  // ==================== REGISTER ====================

  describe('register', () => {
    const registerDto: CreateUserDto = {
      email: '  TEST@TEST.com  ',
      password: 'password123',
    };

    it('devrait créer un utilisateur et retourner ses infos sans le mot de passe', async () => {
      // 1. Aucun utilisateur existant
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // 2. Hash mocking
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      // 3. Création en DB mocking
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register(registerDto);

      // Vérifie que l'email a été normalisé (trim + lowercase)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });

      // Vérifie que le hash a été appelé avec le bon password
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      // Vérifie la création en DB
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@test.com',
          password: 'hashedPassword123',
        },
      });

      // Vérifie que le mot de passe n'est PAS dans le retour
      expect(result).toEqual({
        id: 1,
        email: 'test@test.com',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('devrait rejeter un email vide', async () => {
      await expect(
        authService.register({ email: '   ', password: 'password123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter un email déjà utilisé (ConflictException)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      // Vérifie qu'aucune création n'a eu lieu
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ==================== LOGIN ====================

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@test.com',
      password: 'correctPassword',
    };

    it('devrait retourner un token JWT et les infos user pour des identifiants valides', async () => {
      // 1. L'utilisateur existe en DB
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // 2. Le mot de passe correspond
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // 3. JWT signe un token
      (jwtService.sign as jest.Mock).mockReturnValue('fake-jwt-token');

      const result = await authService.login(loginDto);

      expect(result).toEqual({
        access_token: 'fake-jwt-token',
        user: { id: 1, email: 'test@test.com' },
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'test@test.com',
      });
    });

    it('devrait lever UnauthorizedException si utilisateur inexistant', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever UnauthorizedException si mot de passe incorrect', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("devrait normaliser l'email (trim + lowercase) avant la recherche", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('token');

      await authService.login({
        email: '  TEST@TEST.com  ',
        password: 'correctPassword',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });
  });
});
