import { Injectable, Logger } from '@nestjs/common'
import {
  estimateFreightRate,
  normalizeTruckType,
  FreightEstimate,
  PricingInput,
} from '@lorrycarry/shared'
import { EstimatePriceDto } from './dto/estimate-price.dto'

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name)

  /**
   * Calculates indicative freight rate estimate grounded in Indian transport economics.
   * Utilizes shared logistics intelligence engine from @lorrycarry/shared.
   */
  estimate(dto: EstimatePriceDto): FreightEstimate {
    const truckType = normalizeTruckType(dto.truckType)

    const input: PricingInput = {
      distanceKm: dto.distanceKm,
      tonnage: dto.tonnage,
      truckType,
      loadingLat: dto.loadingLat,
      loadingLng: dto.loadingLng,
      unloadingLat: dto.unloadingLat,
      unloadingLng: dto.unloadingLng,
    }

    this.logger.debug(
      `Calculating freight estimate: ${input.tonnage}T, ${input.truckType}, distance: ${input.distanceKm ?? 'coords-based'}`
    )

    return estimateFreightRate(input)
  }
}
