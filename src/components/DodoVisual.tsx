import { useRef } from 'react'
import { motion } from 'framer-motion'

const hatchFrames = [
  '/assets/dodo/hatch-01-idle.png',
  '/assets/dodo/hatch-02-wobble.png',
  '/assets/dodo/hatch-03-crack-peek.png',
  '/assets/dodo/hatch-04-squeeze.png',
  '/assets/dodo/hatch-05-stuck.png',
  '/assets/dodo/hatch-06-pop-free.png',
  '/assets/dodo/hatch-07-compose.png',
  '/assets/dodo/hatch-08-delivery.png',
] as const

interface DodoVisualProps {
  variant?: 'hero' | 'egg' | 'delivery' | 'hatchVideo'
  hatchStep?: number
  className?: string
  onVideoEnded?: () => void
  onVideoError?: () => void
}

export function DodoVisual({ variant = 'hero', hatchStep = 1, className = '', onVideoEnded, onVideoError }: DodoVisualProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const boundedStep = Math.min(Math.max(hatchStep, 1), hatchFrames.length)
  const src = variant === 'hero'
    ? '/assets/dodo/sweet-one-hero.png'
    : variant === 'delivery'
      ? '/assets/dodo/sweet-one-delivery.png'
      : variant === 'hatchVideo'
        ? '/assets/dodo/dodo-hatch.mp4'
        : hatchFrames[boundedStep - 1]
  const alt = variant === 'egg'
    ? `The Sweet One hatch sequence frame ${boundedStep}`
    : 'The Sweet One Dodo'

  return (
    <div className={`relative flex h-full min-h-[260px] w-full items-center justify-center overflow-hidden rounded-lg border border-[#e8d8c6]/70 bg-[#f3e7d8] shadow-[0_18px_70px_rgba(51,38,28,0.28)] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.7),transparent_44%),linear-gradient(180deg,rgba(251,245,237,0.55),rgba(226,204,184,0.34))]" />
      {variant === 'hatchVideo' ? (
        <video
          ref={videoRef}
          className="relative z-10 h-full w-full object-contain"
          src={src}
          poster="/assets/dodo/hatch-01-idle.png"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={onVideoEnded}
          onError={onVideoError}
          onCanPlay={() => {
            void videoRef.current?.play().catch(() => onVideoError?.())
          }}
        />
      ) : (
      <motion.img
        key={src}
        src={src}
        alt={alt}
        className="relative z-10 max-h-full max-w-full object-contain"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{
          opacity: 1,
          scale: variant === 'egg' && boundedStep === 2 ? 1.02 : 1,
          rotate: variant === 'egg' && boundedStep === 2 ? [-1.8, 2, -1.2, 0] : 0,
          y: 0,
        }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.36, ease: 'easeOut' }}
      />
      )}
    </div>
  )
}
