import { motion } from 'framer-motion'

interface EggProps {
  crackLevel: number
  isHatching: boolean
}

export function Egg({ crackLevel, isHatching }: EggProps) {
  const maxCracks = 8
  const crackPercentage = (crackLevel / maxCracks) * 100

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="relative"
        animate={
          isHatching
            ? {
                rotate: [-5, 5, -5, 5, -10, 10, -10, 10, 0],
                scale: [1, 1.05, 1, 1.1, 1],
              }
            : {
                y: [0, -10, 0],
                rotate: [0, 1, 0, -1, 0],
              }
        }
        transition={
          isHatching
            ? {
                duration: 2,
                ease: 'easeInOut',
              }
            : {
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <svg
          width="280"
          height="320"
          viewBox="0 0 280 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            <radialGradient id="eggGradient" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="oklch(0.95 0.02 85)" />
              <stop offset="70%" stopColor="oklch(0.80 0.12 75)" />
              <stop offset="100%" stopColor="oklch(0.75 0.15 70)" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ellipse
            cx="140"
            cy="180"
            rx="120"
            ry="140"
            fill="url(#eggGradient)"
            filter="url(#glow)"
          />

          {crackLevel >= 1 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 140 40 Q 145 60, 150 80"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 2 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 80 140 Q 75 160, 70 180"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 3 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 200 140 Q 205 160, 210 180"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 4 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 120 200 Q 125 220, 130 240"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 5 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 160 200 Q 155 220, 150 240"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 6 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 100 260 L 115 280"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 7 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 180 260 L 165 280"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {crackLevel >= 8 && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              d="M 140 100 Q 135 130, 130 160 M 140 100 Q 145 130, 150 160"
              stroke="oklch(0.25 0.10 285)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </svg>

        {crackLevel > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.6 }}
            style={{
              background: 'radial-gradient(circle, oklch(0.65 0.25 340) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        )}
      </motion.div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <div className="text-sm font-body text-muted-foreground">
            {crackPercentage.toFixed(0)}% hatched
          </div>
        </div>
      </div>
    </div>
  )
}
