import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsOptional,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator'

/**
 * Interface languages the platform ships translations for.
 *
 * Kept in lockstep with `UI_LANGUAGES` in apps/web/src/lib/language.ts.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ta', 'hi'] as const

/**
 * Partial update of a user's application preferences.
 *
 * Every field is optional; only supplied keys are persisted. Values are
 * constrained to the sets the frontend actually offers so invalid states
 * cannot be stored.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string

  @ApiPropertyOptional({
    description:
      'UI language code. Restricted to languages with a shipped interface ' +
      'translation (English, Tamil, Hindi). Codes such as te/kn/mr/gu/bn were ' +
      'previously accepted but had no locale catalogue, so they stored a ' +
      'preference the interface silently ignored. Extend this list only when ' +
      'the matching locale file ships in apps/web/src/locales.',
    enum: [...SUPPORTED_LANGUAGES],
  })
  @IsOptional()
  @IsIn([...SUPPORTED_LANGUAGES])
  language?: string

  @ApiPropertyOptional({ enum: ['INR'] })
  @IsOptional()
  @IsIn(['INR'])
  currency?: string

  @ApiPropertyOptional({ enum: ['km', 'mi'] })
  @IsOptional()
  @IsIn(['km', 'mi'])
  distanceUnit?: string

  @ApiPropertyOptional({ description: 'Receive WhatsApp notifications' })
  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean

  @ApiPropertyOptional({ description: 'Receive SMS notifications' })
  @IsOptional()
  @IsBoolean()
  notifySms?: boolean

  @ApiPropertyOptional({ description: 'Receive push notifications' })
  @IsOptional()
  @IsBoolean()
  notifyPush?: boolean

  @ApiPropertyOptional({ description: 'Receive checkpoint/tracking alerts' })
  @IsOptional()
  @IsBoolean()
  notifyCheckpoints?: boolean

  @ApiPropertyOptional({ description: 'Default search radius in km', minimum: 5, maximum: 500 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(500)
  defaultRadiusKm?: number

  @ApiPropertyOptional({ description: 'Preferred truck body type filter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredBodyType?: string

  @ApiPropertyOptional({ description: 'Auto-detect location via GPS on search' })
  @IsOptional()
  @IsBoolean()
  autoDetectLocation?: boolean

  @ApiPropertyOptional({ description: 'Allow profile to be visible to counterparties' })
  @IsOptional()
  @IsBoolean()
  profileVisible?: boolean
}

/**
 * Marks a single notification as read.
 */
export class MarkNotificationReadDto {
  @ApiPropertyOptional({ description: 'Notification identifier from the feed' })
  @IsString()
  @MaxLength(200)
  notificationKey!: string
}
