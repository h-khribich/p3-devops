import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // US03 : Création de compte
  async register(createUserDto: CreateUserDto) {
    // 1. Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    // 2. Hacher le mot de passe (Sécurité US03)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // 3. Créer l'utilisateur en BDD
    const newUser = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
      },
    });

    // On retourne l'user sans le mot de passe
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = newUser;
    return result;
  }

  // US04 : Connexion utilisateur
  async login(loginUserDto: LoginUserDto) {
    // 1. Trouver l'utilisateur par email
    const user = await this.prisma.user.findUnique({
      where: { email: loginUserDto.email },
    });

    // 2. Vérifier si l'utilisateur existe et si le mot de passe correspond
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    // 3. Générer le token JWT (US04)
    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email }, // Optionnel : renvoyer les infos de base
    };
  }
}
