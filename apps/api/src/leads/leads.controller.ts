import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../common/decorators/public.decorator'
import { CreateLeadDto } from './dto/create-lead.dto'
import { LeadsService } from './leads.service'

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Public Request Demo intake.
   *
   * Tightly throttled because it is unauthenticated. The handler never
   * persists the payload — it validates and returns a WhatsApp (and optional
   * mailto) hand-off URL so the visitor sends the details themselves.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Submit a Request Demo lead',
    description:
      'Validates a demo request and returns a WhatsApp hand-off URL. The payload is not stored.',
  })
  @ApiResponse({ status: 200, description: 'Lead accepted — WhatsApp hand-off URL returned' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  submit(@Body() dto: CreateLeadDto) {
    return this.leadsService.submit(dto)
  }
}
