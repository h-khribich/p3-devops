import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'user@example.com',
  })
  @IsEmail({}, { message: "Format d'email invalide" }) // US03 : Email valide
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Mot de passe (min. 8 caractères)',
    example: 'motDePasse123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' }) // US03 : Min 8 chars
  @IsNotEmpty()
  password!: string;
}
