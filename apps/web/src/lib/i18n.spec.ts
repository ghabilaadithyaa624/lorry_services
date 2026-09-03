import en from '@/locales/en.json'
import ta from '@/locales/ta.json'
import hi from '@/locales/hi.json'
import { translate } from './i18n'
import { UI_LANGUAGES } from './language'

describe('i18n JSON catalogues (Tamil / Hindi / English)', () => {
  it('provides a matching key set across all three locale files', () => {
    const enKeys = Object.keys(en).sort()
    const taKeys = Object.keys(ta).sort()
    const hiKeys = Object.keys(hi).sort()
    expect(taKeys).toEqual(enKeys)
    expect(hiKeys).toEqual(enKeys)
  })

  it('has no empty translation values in any locale', () => {
    for (const catalog of [en, ta, hi]) {
      for (const value of Object.values(catalog)) {
        expect(typeof value).toBe('string')
        expect((value as string).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('resolves keys per language and falls back to English for a missing key', () => {
    expect(translate('nav.findTrucks', 'en')).toBe('Find Trucks')
    expect(translate('nav.findTrucks', 'ta')).toBe('சரக்கு வண்டிகள் தேடு')
    expect(translate('nav.findTrucks', 'hi')).toBe('ट्रक खोजें')
    expect(translate('this.key.does.not.exist', 'ta')).toBe('this.key.does.not.exist')
  })

  it('covers every language exposed by the top-bar language selector', () => {
    for (const option of UI_LANGUAGES) {
      expect(['en', 'ta', 'hi']).toContain(option.value)
    }
  })
})
