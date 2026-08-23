import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import * as cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { getAllowedOrigins } from './common/utils/cors.util'
import { getCsrfMiddleware } from './common/utils/csrf.util'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const configService = app.get(ConfigService)
  
  // Use cookie parser before CSRF
  app.use(cookieParser())

  // Conditional CSRF protection
  const csrfSecret = configService.get<string>('CSRF_SECRET') || 'default-csrf-secret-key-change-in-production'
  app.use(getCsrfMiddleware(csrfSecret))

  // Security headers with helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

  // Enable CORS with fallbacks
  const allowedOrigins = getAllowedOrigins(configService)

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
