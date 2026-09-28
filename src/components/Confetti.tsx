import { motion } from 'framer-motion'

interface ConfettiProps {
  show: boolean
}

export function Confetti({ show }: ConfettiProps) {
  if (!show) return null

  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
    color: [
      'oklch(0.65 0.25 340)',
      'oklch(0.75 0.15 70)',
      'oklch(0.35 0.15 290)',
      'oklch(0.95 0.02 85)',
    ][Math.floor(Math.random() * 4)],
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: '-5%',
            backgroundColor: piece.color,
            rotate: piece.rotation,
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 50,
            opacity: [1, 1, 0],
            rotate: piece.rotation + 720,
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
