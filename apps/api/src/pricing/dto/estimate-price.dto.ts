import { IsEnum, IsNumber, IsOptional, IsPositive, Min, Max, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

/** Canonical vehicle body types supported by the pricing model. */
export enum PricingTruckType {
  Open = 'Open',
  Container = 'Container',
  OpenBody = 'OpenBody',
}

export class EstimatePriceDto {
  @ApiProperty({
    example: 14,
    description: 'Cargo payload in metric tons (required, positive number)',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0.1)
  @Type(() => Number)
  tonnage: number

  @ApiProperty({
    example: 'Open',
    description: 'Truck / body configuration type (Open, Container, OpenBody)',
    enum: PricingTruckType,
  })
  @IsNotEmpty()
  @IsEnum(PricingTruckType, {
    message: 'truckType must be one of: Open, Container, OpenBody',
  })
  truckType: string

  @ApiPropertyOptional({
    example: 840,
    description: 'Transit distance in kilometers (optional; calculated from coordinates or fallback corridor)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  distanceKm?: number

  @ApiPropertyOptional({
    example: 18.5204,
    description: 'Origin / loading latitude (-90 to 90)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  loadingLat?: number

  @ApiPropertyOptional({
    example: 73.8567,
    description: 'Origin / loading longitude (-180 to 180)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  loadingLng?: number

  @ApiPropertyOptional({
    example: 12.9716,
    description: 'Destination / unloading latitude (-90 to 90)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  unloadingLat?: number

  @ApiPropertyOptional({
    example: 77.5946,
    description: 'Destination / unloading longitude (-180 to 180)',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  unloadingLng?: number
}

export class LongHaulAdjustmentDto {
  @ApiProperty({ example: true, description: 'Whether long-haul scale discount was applied' })
  applied: boolean

  @ApiProperty({ example: 6, description: 'Discount percentage applied' })
  discountPercent: number

  @ApiProperty({ example: '6% Regional Long-Haul Discount (>500 km)', description: 'Human-readable discount label' })
  label: string

  @ApiProperty({ example: 'Regional highway transit (>500 km) reflects distance scale efficiencies.', description: 'Detailed explanation' })
  description: string
}

export class TruckTypeAdjustmentDto {
  @ApiProperty({ example: 3.40, description: 'Base rate per ton-kilometer in INR' })
  baseRatePerTonKm: number

  @ApiProperty({ example: 2500, description: 'Fixed terminal loading/unloading buffer fee in INR' })
  handlingFee: number

  @ApiProperty({ example: 'Standard Open Body Lorry (Base freight benchmark)', description: 'Truck configuration description' })
  description: string
}

export class PriceSensitivityPointDto {
  @ApiProperty({ example: 12.6, description: 'Payload tonnage for sensitivity scenario' })
  tonnage: number

  @ApiProperty({ example: 39900, description: 'Calculated freight cost in INR' })
  cost: number

  @ApiProperty({ example: '-10% Payload (12.6T)', description: 'Scenario label' })
  label: string
}

export class PriceSensitivityDto {
  @ApiProperty({ type: PriceSensitivityPointDto, description: '-10% payload scenario' })
  minus10Percent: PriceSensitivityPointDto

  @ApiProperty({ type: PriceSensitivityPointDto, description: 'Current payload baseline' })
  current: PriceSensitivityPointDto

  @ApiProperty({ type: PriceSensitivityPointDto, description: '+10% payload scenario' })
  plus10Percent: PriceSensitivityPointDto

  @ApiProperty({ example: 2685, description: 'Approximate marginal cost per additional ton in INR' })
  costPerAdditionalTon: number
}

export class RouteComparisonOptionDto {
  @ApiProperty({ example: 'Open', description: 'Vehicle/route configuration type' })
  type: string

  @ApiProperty({ example: 'Open Body Truck', description: 'Display label' })
  label: string

  @ApiProperty({ example: 840, description: 'Transit distance in km' })
  distanceKm: number

  @ApiProperty({ example: 3.20, description: 'Effective rate per ton-km in INR' })
  ratePerTonKm: number

  @ApiProperty({ example: 2500, description: 'Terminal handling fee in INR' })
  handlingFee: number

  @ApiProperty({ example: 40100, description: 'Recommended target freight cost in INR' })
  recommendedTarget: number

  @ApiProperty({ example: true, description: 'Whether this option matches current selection' })
  isCurrent: boolean
}

export class FreightEstimateResponseDto {
  @ApiProperty({ example: 36100, description: 'Minimum estimated freight cost in INR (-10% market variance)' })
  minEstimate: number

  @ApiProperty({ example: 40100, description: 'Recommended target freight cost in INR' })
  recommendedTarget: number

  @ApiProperty({ example: 46100, description: 'Maximum estimated freight cost in INR (+15% market variance)' })
  maxEstimate: number

  @ApiProperty({ example: 3.20, description: 'Effective rate per ton-km after long-haul discounts in INR' })
  ratePerTonKm: number

  @ApiProperty({ example: 840, description: 'Route distance in kilometers' })
  distanceKm: number

  @ApiProperty({ example: 2500, description: 'Base loading/unloading buffer charge in INR' })
  baseHandlingCharge: number

  @ApiProperty({ example: 14, description: 'Cargo tonnage evaluated' })
  tonnage: number

  @ApiProperty({ example: 'Open', description: 'Truck type evaluated' })
  truckType: string

  @ApiProperty({ example: 'HIGH', enum: ['HIGH', 'MEDIUM', 'BENCHMARK'], description: 'Estimation confidence level' })
  confidence: 'HIGH' | 'MEDIUM' | 'BENCHMARK'

  @ApiProperty({ example: true, description: 'Flag denoting this is an estimated rate' })
  isEstimated: boolean

  @ApiProperty({ example: true, description: 'Flag denoting estimate is derived from benchmark model' })
  isBenchmarkBased: boolean

  @ApiProperty({
    example: 'Indicative benchmark estimate. Rule-based model grounded in Indian freight economics — not a guaranteed spot market quote.',
    description: 'Commercial disclaimer',
  })
  disclaimer: string

  @ApiProperty({
    example: 'Indicative benchmark estimate derived from ₹3.20/ton-km rate for 14T Open across 840 km transit with ₹2,500 loading/unloading buffer.',
    description: 'Transparent formula explanation',
  })
  explanation: string

  @ApiProperty({ type: LongHaulAdjustmentDto, description: 'Long-haul scale discount factors' })
  longHaulAdjustment: LongHaulAdjustmentDto

  @ApiProperty({ type: TruckTypeAdjustmentDto, description: 'Truck configuration pricing factors' })
  truckTypeAdjustment: TruckTypeAdjustmentDto

  @ApiProperty({ type: PriceSensitivityDto, description: '±10% payload sensitivity analysis' })
  priceSensitivity: PriceSensitivityDto

  @ApiProperty({ type: [RouteComparisonOptionDto], description: 'Alternative vehicle & route configuration comparisons' })
  routeComparison: RouteComparisonOptionDto[]
}
