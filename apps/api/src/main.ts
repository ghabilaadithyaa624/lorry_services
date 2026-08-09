import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const configService = app.get(ConfigService)
  
  // Security headers with helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

  // Enable CORS with fallbacks
  const allowedOrigins = Array.from(new Set([
    configService.get('CLIENT_URL'),
    configService.get('ADMIN_URL'),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://localhost:3011',
  ].filter(Boolean)))

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })
  
  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }))
  
  // API prefix
  app.setGlobalPrefix('api/v1')
  
  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('LorryCarry API')
    .setDescription('Truck-load matching marketplace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)
  
  const port = Number(configService.get('PORT')) || 3002
  await app.listen(port, '0.0.0.0')
  
  console.log(`🚀 API running on http://localhost:${port}/api/v1`)
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
