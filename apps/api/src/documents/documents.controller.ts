import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('generate-upload-url')
  @ApiOperation({ summary: 'Generate a pre-signed S3 upload URL for a document' })
  async generateUploadUrl(@CurrentUser('id') userId: string, @Body() dto: GenerateUploadUrlDto) {
    return this.documentsService.generateUploadUrl(
      userId,
      dto.entityId,
      dto.entityType,
      dto.documentType,
      dto.contentType,
    );
  }
}
