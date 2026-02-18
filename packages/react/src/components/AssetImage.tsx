/**
 * AssetImage — image component that handles asset loading gracefully.
 *
 * Shows a placeholder while the asset is loading, then fades in.
 * Falls back to a transparent placeholder if no placeholder is given.
 */

import { useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { useAsset } from '../hooks/useAsset'

export interface AssetImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Asset path */
  src: string
  /** Placeholder src to show while loading (default: transparent 1x1) */
  placeholder?: string
  /** Fade-in duration in ms (default: 200) */
  fadeIn?: number
}

const TRANSPARENT =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function AssetImage({
  src,
  placeholder = TRANSPARENT,
  fadeIn = 200,
  style,
  ...rest
}: AssetImageProps) {
  const { url, isReady } = useAsset(src)
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      {...rest}
      src={isReady ? url : placeholder}
      onLoad={() => setLoaded(true)}
      style={{
        transition: fadeIn > 0 ? `opacity ${fadeIn}ms ease` : undefined,
        opacity: isReady && loaded ? 1 : 0,
        ...style,
      }}
    />
  )
}
