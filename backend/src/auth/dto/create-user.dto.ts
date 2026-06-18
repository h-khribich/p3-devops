import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: "Format d'email invalide" }) // US03 : Email valide
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' }) // US03 : Min 8 chars
  @IsNotEmpty()
  password!: string;
}
