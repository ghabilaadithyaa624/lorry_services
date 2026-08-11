import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User full name or business contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string
}
