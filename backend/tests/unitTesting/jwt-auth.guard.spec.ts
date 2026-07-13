import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // ============================================================
  //  Fonction utilitaire pour créer un faux contexte HTTP
  //  Important : on garde la RÉFÉRENCE de la requête pour pouvoir
  //  vérifier que le guard a bien modifié request.user
  // ============================================================
  function createMockContext(authHeader?: string) {
    const request = {
      headers: {
        authorization: authHeader,
      },
      user: undefined as any, // Sera rempli si le guard réussit
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request, // Toujours la même référence
      }),
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mon-secret-jwt'),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // Reset des mocks entre chaque test
    jest.clearAllMocks();
  });

  // ==================== canActivate ====================

  describe('canActivate', () => {
    it('devrait retourner true pour un token valide', () => {
      // On simule un token JWT valide qui se décode correctement
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 1,
        email: 'test@test.com',
      });

      const context = createMockContext('Bearer mon-token-valide');

      const result = guard.canActivate(context);

      expect(result).toBe(true);

      // Vérifie que le user a été injecté dans la requête
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        sub: 1,
        email: 'test@test.com',
      });

      // Vérifie que verify a été appelé avec le bon secret
      expect(jwtService.verify).toHaveBeenCalledWith('mon-token-valide', {
        secret: 'mon-secret-jwt',
      });
    });

    it('devrait lever UnauthorizedException si le header Authorization est absent', () => {
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Token manquant.');
    });

    it("devrait lever UnauthorizedException si le header ne commence pas par 'Bearer '", () => {
      const context = createMockContext('Basic credentials');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Token manquant.');
    });

    it('devrait lever UnauthorizedException si le header est une chaîne vide', () => {
      const context = createMockContext('');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException si le token est invalide (mauvaise signature)', () => {
      // JWT.verify lève une erreur (token invalide/expiré/mauvaise signature)
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const context = createMockContext('Bearer token-invalide');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Token invalide.');
    });

    it('devrait lever UnauthorizedException si le token est expiré', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const context = createMockContext('Bearer token-expire');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('devrait lever UnauthorizedException pour un token avec un mauvais format', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const context = createMockContext('Bearer pas-un-jwt');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('devrait utiliser le secret du ConfigService pour vérifier le token', () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 1,
        email: 'test@test.com',
      });

      const context = createMockContext('Bearer mon-token');

      guard.canActivate(context);

      // Vérifie que le secret a bien été récupéré depuis la config
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
