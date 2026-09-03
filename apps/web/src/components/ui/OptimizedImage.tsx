'use client'

import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string
  fallbackSrc?: string
  wrapperClassName?: string
  /** When true, image loads eagerly with high priority (for LCP). */
  priority?: boolean
}

/**
 * OptimizedImage — Performance-tuned wrapper around next/image
 *
 * Defaults:
 * - decoding="async"
 * - loading="lazy" (unless priority)
 * - sizes responsive fallback
 * - quality 75-85 balanced for freight imagery
 *
 * Use `priority` only for above-the-fold LCP images (hero).
 */
export function OptimizedImage({
  alt,
  className,
  wrapperClassName,
  priority = false,
  sizes,
  quality = 75,
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      sizes={sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
      quality={quality}
      className={cn(className)}
      priority={priority}
      {...props}
    />
  )
}

export default OptimizedImage
