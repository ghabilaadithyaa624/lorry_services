import {
  UI_LANGUAGES,
  isUiLanguage,
  readStoredLanguage,
  applyLanguage,
  persistLanguage,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_DIRECTIONS,
  LANGUAGE_SELECT_OPTIONS,
  SUPPORTED_LANGUAGE_CODES,
  normalizeLanguage,
  detectBrowserLanguage,
  hasStoredLanguage,
  resolveInitialLanguage,
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

  describe('supported-language guard (settings picker / API parity)', () => {
    it('derives the supported code list from the toggle so surfaces cannot drift', () => {
      expect(SUPPORTED_LANGUAGE_CODES).toEqual(['ta', 'hi', 'en'])
    })

    it('only offers languages that actually have a locale catalogue', () => {
      // Regression: the settings centre used to list te/kn/mr/gu/bn, which
      // stored a preference the interface silently ignored.
      expect(LANGUAGE_SELECT_OPTIONS.map((o) => o.value).sort()).toEqual(['en', 'hi', 'ta'])
      for (const legacy of ['te', 'kn', 'mr', 'gu', 'bn']) {
        expect(LANGUAGE_SELECT_OPTIONS.some((o) => o.value === (legacy as never))).toBe(false)
      }
    })

    it('labels each option with its native name so it is findable in any script', () => {
      const labels = LANGUAGE_SELECT_OPTIONS.map((o) => o.label)
      expect(labels).toContain('தமிழ் (Tamil)')
      expect(labels).toContain('हिन्दी (Hindi)')
      expect(labels).toContain('English')
    })

    it('normalizes legacy/unsupported codes down to a renderable language', () => {
      expect(normalizeLanguage('ta')).toBe('ta')
      expect(normalizeLanguage('te')).toBe('en')
      expect(normalizeLanguage('bn')).toBe('en')
      expect(normalizeLanguage(null)).toBe('en')
      expect(normalizeLanguage(undefined)).toBe('en')
      expect(normalizeLanguage('te', 'hi')).toBe('hi')
    })
  })

  describe('first-visit browser detection', () => {
    /** Stub the device locale list the detector reads. */
    const setNavigator = (languages: string[]) => {
      (global as any).navigator = { languages, language: languages[0] }
    }

    afterEach(() => {
      delete (global as any).navigator
    })

    it('matches a supported base subtag from navigator.languages', () => {
      setNavigator(['ta-IN', 'en-US'])
      expect(detectBrowserLanguage()).toBe('ta')
    })

    it('skips unsupported locales and takes the first supported one', () => {
      setNavigator(['te-IN', 'hi-IN'])
      expect(detectBrowserLanguage()).toBe('hi')
    })

    it('falls back to English for an entirely unsupported device locale', () => {
      setNavigator(['fr-FR'])
      expect(detectBrowserLanguage()).toBe('en')
    })

    it('returns English when no navigator exists (SSR)', () => {
      expect(detectBrowserLanguage()).toBe('en')
    })
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

    it('reports whether an explicit device choice exists', () => {
      expect(hasStoredLanguage()).toBe(false)
      store[LANGUAGE_STORAGE_KEY] = 'fr'
      expect(hasStoredLanguage()).toBe(false)
      store[LANGUAGE_STORAGE_KEY] = 'ta'
      expect(hasStoredLanguage()).toBe(true)
    })

    it('prefers an explicit choice over the detected device language', () => {
      (global as any).navigator = { languages: ['hi-IN'], language: 'hi-IN' }
      expect(resolveInitialLanguage()).toBe('hi') // nothing stored yet → detect
      store[LANGUAGE_STORAGE_KEY] = 'ta'
      expect(resolveInitialLanguage()).toBe('ta') // explicit choice wins
      delete (global as any).navigator
    })

    it('toggles the Tamil font-scaling class on <html> and clears it for other languages', () => {
      persistLanguage('ta')
      expect((global as any).document.documentElement.classList.contains('lang-scale-ta')).toBe(true)

      persistLanguage('en')
      expect((global as any).document.documentElement.classList.contains('lang-scale-ta')).toBe(false)
    })
  })
})
