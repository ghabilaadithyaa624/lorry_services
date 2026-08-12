import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsIn(['TRUCK', 'BOOKING'])
  entityType: 'TRUCK' | 'BOOKING';

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'application/pdf'])
  contentType: string;
}
