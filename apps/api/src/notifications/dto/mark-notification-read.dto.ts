import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class MarkNotificationReadDto {
  @ApiProperty({
    description: 'Notification key from the feed (DB id or derived alert key)',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  notificationKey!: string
}
