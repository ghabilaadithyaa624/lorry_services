import {
  UI_LANGUAGES,
  isUiLanguage,
  readStoredLanguage,
  applyLanguage,
  persistLanguage,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_DIRECTIONS,
} from './language'

describe('Language System (header toggle: தமிழ் | हिन्दी | English)', () => {
  it('orders the toggle தமிழ், हिन्दी, English per the product spec', () => {
    expect(UI_LANGUAGES.map((l) => l.value)).toEqual(['ta', 'hi', 'en'])
    expect(UI_LANGUAGES[0].label).toBe('தமிழ்')
    expect(UI_LANGUAGES[1].label).toBe('हिन्दी')
    expect(UI_LANGUAGES[2].label).toBe('English')
  })

  it('provides short labels for the compact mobile breakpoint', () => {
    for (const option of UI_LANGUAGES) {
      expect(option.shortLabel.length).toBeGreaterThan(0)
      expect(option.shortLabel.length).toBeLessThanOrEqual(option.label.length)
    }
  })

  it('keeps every supported script LTR (Tamil and Devanagari both read left-to-right)', () => {
    expect(LANGUAGE_DIRECTIONS.hi).toBe('ltr')
    expect(LANGUAGE_DIRECTIONS.ta).toBe('ltr')
    expect(LANGUAGE_DIRECTIONS.en).toBe('ltr')
  })

  it('validates supported UI language codes', () => {
    expect(isUiLanguage('en')).toBe(true)
    expect(isUiLanguage('ta')).toBe(true)
    expect(isUiLanguage('hi')).toBe(true)
    expect(isUiLanguage('')).toBe(false)
    expect(isUiLanguage(undefined)).toBe(false)
    expect(isUiLanguage(null)).toBe(false)
    expect(isUiLanguage(42)).toBe(false)
    expect(isUiLanguage('fr')).toBe(false)
  })

  it('falls back to English when no window/storage is available (SSR)', () => {
    expect(readStoredLanguage()).toBe('en')
  })

  it('no-ops safely when applying/persisting without a DOM', () => {
    expect(() => applyLanguage('ta')).not.toThrow()
    expect(() => persistLanguage('ta')).not.toThrow()
  })

  describe('with a mocked browser storage', () => {
    const store: Record<string, string> = {}
    const dispatched: string[] = []

    beforeEach(() => {
      Object.keys(store).forEach((key) => delete store[key])
      dispatched.length = 0
      ;(global as any).window = {
        localStorage: {
          getItem: (key: string) => (key in store ? store[key] : null),
          setItem: (key: string, value: string) => {
            store[key] = value
          },
        },
        dispatchEvent: (event: any) => {
          dispatched.push(event.type)
          return true
        },
      }
      ;(global as any).CustomEvent = class {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      }
      const classes = new Set<string>()
      ;(global as any).document = {
        documentElement: {
          lang: 'en',
          dir: 'ltr',
          classList: {
            add: (...names: string[]) => names.forEach((n) => classes.add(n)),
            remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
            contains: (name: string) => classes.has(name),
          },
        },
      }
    })

    afterEach(() => {
      delete (global as any).window
      delete (global as any).document
      delete (global as any).CustomEvent
    })

    it('reads a persisted preference and rejects unknown values', () => {
      store[LANGUAGE_STORAGE_KEY] = 'ta'
      expect(readStoredLanguage()).toBe('ta')
      store[LANGUAGE_STORAGE_KEY] = 'hi'
      expect(readStoredLanguage()).toBe('hi')
      store[LANGUAGE_STORAGE_KEY] = 'fr'
      expect(readStoredLanguage()).toBe('en')
    })

    it('persists, applies <html lang> and <html dir>, and broadcasts the change', () => {
      persistLanguage('hi')
      expect(store[LANGUAGE_STORAGE_KEY]).toBe('hi')
      expect((global as any).document.documentElement.lang).toBe('hi')
      expect((global as any).document.documentElement.dir).toBe('ltr')
      expect(dispatched).toContain('lc-language-change')
    })

    it('toggles the Tamil font-scaling class on <html> and clears it for other languages', () => {
      persistLanguage('ta')
      expect((global as any).document.documentElement.classList.contains('lang-scale-ta')).toBe(true)

      persistLanguage('en')
      expect((global as any).document.documentElement.classList.contains('lang-scale-ta')).toBe(false)
    })
  })
})
