import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateDisputeDto {
  @ApiProperty({ enum: ['Payment', 'CargoDamage', 'Delay', 'Document', 'Other'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['Payment', 'CargoDamage', 'Delay', 'Document', 'Other'])
  category?: 'Payment' | 'CargoDamage' | 'Delay' | 'Document' | 'Other'

  @ApiProperty({ enum: ['Low', 'Medium', 'High', 'Critical'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['Low', 'Medium', 'High', 'Critical'])
  priority?: 'Low' | 'Medium' | 'High' | 'Critical'

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string
}
