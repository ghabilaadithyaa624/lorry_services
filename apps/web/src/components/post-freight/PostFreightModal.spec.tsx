import { parseRoute, PostFreightModal } from './PostFreightModal'

describe('PostFreightModal', () => {
  it('exports the modal component', () => {
    expect(typeof PostFreightModal).toBe('function')
  })

  describe('parseRoute', () => {
    it('splits arrow-separated corridors into origin and destinations', () => {
      expect(parseRoute('Chennai → Coimbatore')).toEqual({
        origin: 'Chennai',
        destinations: ['Coimbatore'],
      })
    })

    it('supports comma-separated multi-leg routes', () => {
      expect(parseRoute('Mumbai, Pune, Bangalore')).toEqual({
        origin: 'Mumbai',
        destinations: ['Pune', 'Bangalore'],
      })
    })

    it('supports "to" separators and trims whitespace', () => {
      expect(parseRoute('  Delhi  to  Jaipur ')).toEqual({
        origin: 'Delhi',
        destinations: ['Jaipur'],
      })
    })

    it('returns only an origin for single-city input', () => {
      expect(parseRoute('Surat')).toEqual({ origin: 'Surat', destinations: [] })
    })

    it('handles empty input safely', () => {
      expect(parseRoute('   ')).toEqual({ origin: '', destinations: [] })
    })
  })
})
