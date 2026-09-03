import React from 'react'

interface StructuredDataProps {
  data: Record<string, unknown> | Record<string, unknown>[]
  id?: string
}

/**
 * Renders a JSON-LD <script> tag for SEO structured data.
 * Safely stringifies data with escaping for </script> edge cases.
 * Can be used in both Server and Client Components.
 */
export function StructuredData({ data, id }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data]

  return (
    <>
      {jsonLd.map((item, idx) => (
        <script
          key={id ? `${id}-${idx}` : idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
          suppressHydrationWarning
        />
      ))}
    </>
  )
}

export default StructuredData
