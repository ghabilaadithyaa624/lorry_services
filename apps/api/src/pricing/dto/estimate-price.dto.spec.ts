import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { EstimatePriceDto } from './estimate-price.dto'

describe('EstimatePriceDto Validation', () => {
  it('should pass validation with valid required fields', async () => {
    const dto = plainToInstance(EstimatePriceDto, {
      tonnage: 12,
      truckType: 'Open',
    })

    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('should pass validation with all valid optional fields', async () => {
    const dto = plainToInstance(EstimatePriceDto, {
      tonnage: 15.5,
      truckType: 'Container',
      distanceKm: 850,
      loadingLat: 18.5204,
      loadingLng: 73.8567,
      unloadingLat: 12.9716,
      unloadingLng: 77.5946,
    })

    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('should fail when tonnage is missing or non-positive', async () => {
    const dtoMissing = plainToInstance(EstimatePriceDto, {
      truckType: 'Open',
    })
    const errorsMissing = await validate(dtoMissing)
    expect(errorsMissing.length).toBeGreaterThan(0)
    expect(errorsMissing.some((e) => e.property === 'tonnage')).toBe(true)

    const dtoNegative = plainToInstance(EstimatePriceDto, {
      tonnage: -5,
      truckType: 'Open',
    })
    const errorsNegative = await validate(dtoNegative)
    expect(errorsNegative.length).toBeGreaterThan(0)
    expect(errorsNegative.some((e) => e.property === 'tonnage')).toBe(true)

    const dtoZero = plainToInstance(EstimatePriceDto, {
      tonnage: 0,
      truckType: 'Open',
    })
    const errorsZero = await validate(dtoZero)
    expect(errorsZero.length).toBeGreaterThan(0)
    expect(errorsZero.some((e) => e.property === 'tonnage')).toBe(true)
  })

  it('should fail when truckType is missing or not a string', async () => {
    const dto = plainToInstance(EstimatePriceDto, {
      tonnage: 10,
    })
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.property === 'truckType')).toBe(true)
  })

  it('should fail when coordinates are out of valid range', async () => {
    const dtoInvalidLat = plainToInstance(EstimatePriceDto, {
      tonnage: 10,
      truckType: 'Open',
      loadingLat: 95, // max 90
    })
    const errorsLat = await validate(dtoInvalidLat)
    expect(errorsLat.some((e) => e.property === 'loadingLat')).toBe(true)

    const dtoInvalidLng = plainToInstance(EstimatePriceDto, {
      tonnage: 10,
      truckType: 'Open',
      unloadingLng: -190, // min -180
    })
    const errorsLng = await validate(dtoInvalidLng)
    expect(errorsLng.some((e) => e.property === 'unloadingLng')).toBe(true)
  })

  it('should fail when distanceKm is negative', async () => {
    const dto = plainToInstance(EstimatePriceDto, {
      tonnage: 10,
      truckType: 'Open',
      distanceKm: -50,
    })
    const errors = await validate(dto)
    expect(errors.some((e) => e.property === 'distanceKm')).toBe(true)
  })
})
