import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger'
import { Public } from '../common/decorators/public.decorator'
import { PricingService } from './pricing.service'
import { EstimatePriceDto, FreightEstimateResponseDto } from './dto/estimate-price.dto'

@ApiTags('Pricing')
@Controller(['pricing', 'intelligence/pricing'])
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate indicative freight rate estimate',
    description:
      'Calculates an explainable indicative benchmark freight rate estimate for a given route, cargo tonnage, and truck body type using Indian freight economics formulas.',
  })
  @ApiBody({ type: EstimatePriceDto })
  @ApiResponse({
    status: 200,
    description: 'Indicative benchmark freight rate estimate successfully computed',
    type: FreightEstimateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request — invalid input payload (e.g. missing tonnage or truckType, negative values)',
  })
  estimate(@Body() dto: EstimatePriceDto): FreightEstimateResponseDto {
    return this.pricingService.estimate(dto)
  }
}
