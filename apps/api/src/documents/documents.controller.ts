import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('generate-upload-url')
  @ApiOperation({ summary: 'Generate a pre-signed S3 upload URL for a document' })
  async generateUploadUrl(@Request() req, @Body() dto: GenerateUploadUrlDto) {
    const userId = req.user.userId;
    return this.documentsService.generateUploadUrl(
      userId,
      dto.entityId,
      dto.entityType,
      dto.documentType,
      dto.contentType,
    );
  }
}
