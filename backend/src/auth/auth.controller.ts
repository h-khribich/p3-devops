import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth') // Toutes les routes commenceront par /auth
export class AuthController {
  constructor(private authService: AuthService) {}

  // US03 : Route d'inscription (POST /auth/register)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // Le service gère toute la logique, le controller ne fait que passer les données
    return this.authService.register(createUserDto);
  }

  // US04 : Route de connexion (POST /auth/login)
  @Post('login')
  @HttpCode(HttpStatus.OK) // Force le statut 200 même en cas de succès standard
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }
}
