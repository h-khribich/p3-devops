import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

type AuthenticatedUser = {
  id: number;
  email: string;
};

type AuthResponse = {
  access_token: string;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const email = this.normalizeEmail(createUserDto.email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = newUser;
    return result;
  }

  async login(loginUserDto: LoginUserDto): Promise<AuthResponse> {
    const email = this.normalizeEmail(loginUserDto.email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      !(await bcrypt.compare(loginUserDto.password, user.password))
    ) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email }),
      user: this.toAuthenticatedUser(user),
    };
  }

  private normalizeEmail(email: string) {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException("L'adresse email ne peut pas être vide.");
    }

    return normalized;
  }

  private toAuthenticatedUser(user: {
    id: number;
    email: string;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
    };
  }
}
