import { formatINR, formatPhone, timeAgo } from './utils'

describe('timeAgo', () => {
  it('should format times less than 60 seconds ago as "Just now"', () => {
    const now = new Date()
    const fiveSecondsAgo = new Date(now.getTime() - 5 * 1000)
    const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000)
    expect(timeAgo(now)).toBe('Just now')
    expect(timeAgo(fiveSecondsAgo)).toBe('Just now')
    expect(timeAgo(fiftyNineSecondsAgo)).toBe('Just now')
  })

  it('should format times less than 60 minutes ago as "Xm ago"', () => {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
    const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000)
    expect(timeAgo(oneMinuteAgo)).toBe('1m ago')
    expect(timeAgo(tenMinutesAgo)).toBe('10m ago')
    expect(timeAgo(fiftyNineMinutesAgo)).toBe('59m ago')
  })

  it('should format times less than 24 hours ago as "Xh ago"', () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000)
    expect(timeAgo(oneHourAgo)).toBe('1h ago')
    expect(timeAgo(twelveHoursAgo)).toBe('12h ago')
    expect(timeAgo(twentyThreeHoursAgo)).toBe('23h ago')
  })

  it('should format times less than 7 days ago as "Xd ago"', () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    expect(timeAgo(oneDayAgo)).toBe('1d ago')
    expect(timeAgo(fourDaysAgo)).toBe('4d ago')
    expect(timeAgo(sixDaysAgo)).toBe('6d ago')
  })

  it('should format times less than 30 days ago as "Xw ago"', () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
    expect(timeAgo(sevenDaysAgo)).toBe('1w ago')
    expect(timeAgo(fourteenDaysAgo)).toBe('2w ago')
    expect(timeAgo(twentyNineDaysAgo)).toBe('4w ago')
  })

  it('should format times 30 days or older as "en-IN" local date format', () => {
    // We can use a fixed date to avoid locale timezone mismatch/shifts in testing
    const pastDate = new Date('2023-05-15T12:00:00')
    const formatted = pastDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    expect(timeAgo(pastDate)).toBe(formatted)
  })

  it('should support string date inputs', () => {
    const pastDateStr = '2023-05-15T12:00:00'
    const formatted = new Date(pastDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    expect(timeAgo(pastDateStr)).toBe(formatted)
  })
})

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
