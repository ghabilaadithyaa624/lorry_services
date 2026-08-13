import { formatINR, formatPhone } from './utils'

describe('formatPhone', () => {
  it('should return empty string when input is falsy or empty', () => {
    expect(formatPhone('')).toBe('')
    expect(formatPhone(null as any)).toBe('')
    expect(formatPhone(undefined as any)).toBe('')
  })

  it('should correctly format a valid 13-character +91 phone number without spaces', () => {
    expect(formatPhone('+918072025106')).toBe('+91 80720 25106')
  })

  it('should correctly format a valid 13-character +91 phone number that has spaces', () => {
    expect(formatPhone('+91 80720 25106')).toBe('+91 80720 25106')
    expect(formatPhone(' +91  80720  25106 ')).toBe('+91 80720 25106')
  })

  it('should return the original phone number if it does not start with +91', () => {
    expect(formatPhone('+18072025106')).toBe('+18072025106')
    expect(formatPhone('918072025106')).toBe('918072025106')
  })

  it('should return the original phone number if start is +91 but length is not 13 after cleaning', () => {
    expect(formatPhone('+91807202510')).toBe('+91807202510') // 12 chars
    expect(formatPhone('+9180720251067')).toBe('+9180720251067') // 14 chars
  })
})

describe('formatINR', () => {
  describe('Positive numbers', () => {
    it('should format thousands correctly', () => {
      expect(formatINR(45000)).toBe('₹45,000')
    })

    it('should format lakhs correctly with Indian numbering', () => {
      expect(formatINR(1500000)).toBe('₹15,00,000')
    })

    it('should format crores correctly with Indian numbering', () => {
      expect(formatINR(10000000)).toBe('₹1,00,00,000')
    })

    it('should format decimal amounts correctly', () => {
      expect(formatINR(123456.78)).toBe('₹1,23,456.78')
    })
  })

  describe('Numeric strings', () => {
    it('should format numeric strings of thousands correctly', () => {
      expect(formatINR('45000')).toBe('₹45,000')
    })

    it('should format numeric strings of lakhs correctly', () => {
      expect(formatINR('1500000')).toBe('₹15,00,000')
    })

    it('should format decimal numeric strings correctly', () => {
      expect(formatINR('123456.78')).toBe('₹1,23,456.78')
    })
  })

  describe('Zero, Negative and Edge Cases', () => {
    it('should return ₹0 when value is 0', () => {
      expect(formatINR(0)).toBe('₹0')
    })

    it('should return ₹0 when value is "0"', () => {
      expect(formatINR('0')).toBe('₹0')
    })

    it('should handle negative numbers by prefixing minus or inside', () => {
      // In Javascript toLocaleString('en-IN') for -123456 is usually -1,23,456,
      // so formatINR will return ₹-1,23,456 or -₹1,23,456 depending on how platform formats it.
      // Let's test the current actual implementation behavior.
      const result = formatINR(-123456)
      expect(result).toBe('₹-1,23,456')
    })

    it('should return ₹0 when value is NaN', () => {
      expect(formatINR(NaN)).toBe('₹0')
    })

    it('should return ₹0 when string is empty', () => {
      expect(formatINR('')).toBe('₹0')
    })

    it('should return ₹0 when string is invalid/non-numeric', () => {
      expect(formatINR('abc')).toBe('₹0')
    })

    it('should handle mixed non-numeric strings by parsing what is possible', () => {
      // parseFloat('123abc') parses as 123
      expect(formatINR('123abc')).toBe('₹123')
    })
  })
})
