import * as fs from 'fs'
import * as path from 'path'

/**
 * Homepage truthfulness guard (Prompt 2 — placeholder testimonial removal).
 *
 * The public homepage must never render placeholder customer content: no
 * invented quotes, names, companies, reviews, logos, metrics, or
 * certifications. The former testimonial slot is a "Platform Capabilities"
 * section describing shipped product capabilities only.
 *
 * These tests read the homepage sources as text so the guard holds without
 * rendering Next.js client components in the node test environment.
 */

const PAGE_SOURCE = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8')
const HERO_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'HeroSection.tsx'),
  'utf8'
)
const HOMEPAGE_COPY = `${PAGE_SOURCE}\n${HERO_SOURCE}`.toLowerCase()

/** Fragments of placeholder / fabricated customer content. Must never appear. */
const BANNED_PLACEHOLDER_FRAGMENTS = [
  'operator feedback',
  '(placeholder)',
  'placeholder customer',
  'placeholder name',
  'placeholder company',
  'placeholder quote',
  'customer quote',
  'lorem ipsum',
  'john doe',
  'jane doe',
  'acme',
  'trusted by',
  'loved by',
  'what our customers say',
  'what our clients say',
  'success stories',
  'wall of love',
]

/** The six truthful platform capabilities the homepage must describe. */
const REQUIRED_CAPABILITY_PHRASES = [
  'direct shipper',
  'transporter marketplace',
  '50km proximity matching',
  'vahan-ready truck verification',
  'checkpoint-based tracking',
  'contact unlock via subscription',
  'zero broker commission',
]

describe('homepage placeholder-testimonial removal', () => {
  it.each(BANNED_PLACEHOLDER_FRAGMENTS)(
    'renders no placeholder customer fragment: %s',
    (fragment) => {
      expect(HOMEPAGE_COPY).not.toContain(fragment)
    }
  )

  it('keeps the transparency note that no testimonials are published', () => {
    expect(PAGE_SOURCE).toContain(
      'NO CUSTOMER TESTIMONIALS ARE PUBLISHED UNTIL VERIFIED OPERATOR QUOTES ARE AVAILABLE'
    )
  })

  it('renders the Platform Capabilities section instead of testimonials', () => {
    expect(PAGE_SOURCE).toContain('PLATFORM CAPABILITIES')
    expect(PAGE_SOURCE).toContain('What The Platform Actually Does')
  })
})

describe('homepage platform capabilities', () => {
  it.each(REQUIRED_CAPABILITY_PHRASES)(
    'describes the shipped capability: %s',
    (phrase) => {
      expect(HOMEPAGE_COPY).toContain(phrase)
    }
  )
})
