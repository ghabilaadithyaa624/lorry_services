import { collectChangedFields, EditLoadModal, TRUCK_TYPE_OPTIONS, type EditableLoad } from './EditLoadModal'

const baseLoad: EditableLoad = {
  id: 'load-abc12345',
  userId: 'user-1',
  status: 'Open',
  loadingAddress: 'MIDC Industrial Area, Pune',
  loadingPin: '411018',
  unloadingAddress: 'Electronic City, Bangalore',
  unloadingPin: '560100',
  tonnageRequired: 15,
  truckType: 'Container',
  urgent: false,
  maxPrice: 45000,
  expectedDeliveryAt: '2026-12-31T10:00:00.000Z',
}

const baseForm = {
  loadingAddress: 'MIDC Industrial Area, Pune',
  loadingPin: '411018',
  unloadingAddress: 'Electronic City, Bangalore',
  unloadingPin: '560100',
  tonnage: '15',
  truckType: 'Container',
  maxPrice: '45000',
  urgent: false,
  expectedDelivery: '',
}

describe('EditLoadModal', () => {
  it('exports the modal component and truck type options', () => {
    expect(typeof EditLoadModal).toBe('function')
    expect(TRUCK_TYPE_OPTIONS).toEqual(['Open', 'Container', 'OpenBody'])
  })

  describe('collectChangedFields', () => {
    it('returns an empty diff when the form matches the stored load', () => {
      const fields = collectChangedFields(baseLoad, baseForm)
      expect(fields).toEqual({})
    })

    it('collects edited loading and unloading addresses with PINs', () => {
      const fields = collectChangedFields(baseLoad, {
        ...baseForm,
        loadingAddress: '  Chakan MIDC  ',
        loadingPin: '410501',
        unloadingAddress: 'Peenya Industrial Area',
        unloadingPin: '560058',
      })
      expect(fields).toEqual({
        loadingAddress: 'Chakan MIDC',
        loadingPin: '410501',
        unloadingAddress: 'Peenya Industrial Area',
        unloadingPin: '560058',
      })
    })

    it('collects edited tonnage, truck type, budget and urgent flag', () => {
      const fields = collectChangedFields(baseLoad, {
        ...baseForm,
        tonnage: '18.5',
        truckType: 'Open',
        maxPrice: '48000',
        urgent: true,
      })
      expect(fields).toEqual({
        tonnageRequired: 18.5,
        truckType: 'Open',
        maxPrice: 48000,
        urgent: true,
      })
    })

    it('normalizes an edited expected delivery to ISO', () => {
      const fields = collectChangedFields(baseLoad, {
        ...baseForm,
        expectedDelivery: '2027-01-05T15:30',
      })
      expect(fields.expectedDeliveryAt).toBe(new Date('2027-01-05T15:30').toISOString())
    })

    it('ignores a numerically identical budget written differently', () => {
      const fields = collectChangedFields(baseLoad, { ...baseForm, maxPrice: '45000.0' })
      expect(fields).toEqual({})
    })
  })
})
