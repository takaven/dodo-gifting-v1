import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface GremlinProps {
  mood: 'happy' | 'hungry' | 'playful' | 'sleepy'
  onInteract?: () => void
}

export function Gremlin({ mood, onInteract }: GremlinProps) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(blinkInterval)
  }, [])

  const eyeHeight = blink ? 2 : 12

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
      className="cursor-pointer"
      onClick={onInteract}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg
        width="220"
        height="240"
        viewBox="0 0 220 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="gremlinGradient" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="oklch(0.70 0.28 340)" />
            <stop offset="100%" stopColor="oklch(0.60 0.22 340)" />
          </radialGradient>
        </defs>

        <motion.ellipse
          cx="110"
          cy="140"
          rx="80"
          ry="90"
          fill="url(#gremlinGradient)"
          animate={{
            ry: mood === 'happy' ? [90, 92, 90] : mood === 'playful' ? [90, 95, 90] : 90,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.path
          d="M 50 100 Q 40 70, 35 60 Q 32 50, 40 55 Q 45 58, 48 70 Z"
          fill="oklch(0.65 0.25 340)"
          animate={{
            rotate: mood === 'playful' ? [0, -5, 5, 0] : 0,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
          style={{ transformOrigin: '50px 100px' }}
        />

        <motion.path
          d="M 170 100 Q 180 70, 185 60 Q 188 50, 180 55 Q 175 58, 172 70 Z"
          fill="oklch(0.65 0.25 340)"
          animate={{
            rotate: mood === 'playful' ? [0, 5, -5, 0] : 0,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
          style={{ transformOrigin: '170px 100px' }}
        />

        <ellipse cx="80" cy="130" rx="18" ry={eyeHeight} fill="oklch(0.15 0.08 280)" />
        <ellipse cx="140" cy="130" rx="18" ry={eyeHeight} fill="oklch(0.15 0.08 280)" />

        {!blink && mood === 'happy' && (
          <>
            <ellipse cx="80" cy="130" rx="8" ry="8" fill="oklch(1 0 0)" />
            <ellipse cx="140" cy="130" rx="8" ry="8" fill="oklch(1 0 0)" />
          </>
        )}

        {mood === 'happy' && (
          <motion.path
            d="M 70 165 Q 110 180, 150 165"
            stroke="oklch(0.15 0.08 280)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {mood === 'hungry' && (
          <ellipse cx="110" cy="165" rx="12" ry="15" fill="oklch(0.15 0.08 280)" />
        )}

        {mood === 'sleepy' && (
          <>
            <path d="M 65 130 L 95 130" stroke="oklch(0.15 0.08 280)" strokeWidth="4" strokeLinecap="round" />
            <path d="M 125 130 L 155 130" stroke="oklch(0.15 0.08 280)" strokeWidth="4" strokeLinecap="round" />
            <path d="M 80 165 Q 110 170, 140 165" stroke="oklch(0.15 0.08 280)" strokeWidth="3" fill="none" />
          </>
        )}

        {mood === 'playful' && (
          <>
            <motion.circle
              cx="80"
              cy="128"
              r="10"
              fill="oklch(0.15 0.08 280)"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.circle
              cx="140"
              cy="128"
              r="10"
              fill="oklch(0.15 0.08 280)"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
            />
            <path d="M 85 165 L 110 170 L 135 165" stroke="oklch(0.15 0.08 280)" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        )}

        <motion.ellipse
          cx="110"
          cy="190"
          rx="35"
          ry="25"
          fill="oklch(0.60 0.22 340)"
          opacity="0.6"
          animate={{
            scaleX: [1, 1.1, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.path
          d="M 40 200 Q 35 210, 40 220 L 50 215 L 45 205 Z"
          fill="oklch(0.65 0.25 340)"
          animate={{
            x: mood === 'playful' ? [0, -3, 3, 0] : 0,
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
          }}
        />
        <motion.path
          d="M 180 200 Q 185 210, 180 220 L 170 215 L 175 205 Z"
          fill="oklch(0.65 0.25 340)"
          animate={{
            x: mood === 'playful' ? [0, 3, -3, 0] : 0,
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
          }}
        />
      </svg>

      {mood === 'happy' && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -20, opacity: [0, 1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <span className="text-3xl">✨</span>
        </motion.div>
      )}
    </motion.div>
  )
}
