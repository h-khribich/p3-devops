import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration de base d'OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('API du Projet p3-devops DataShare')
    .setDescription("Documentation des endpoints de l'API")
    .addServer('http://localhost:3000', 'Environnement Local')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Génération du document Swagger
  const document = SwaggerModule.createDocument(app, config);

  // Montage de l'interface graphique sur la route /api-docs
  SwaggerModule.setup('api-docs', app, document);

  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
