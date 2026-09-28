import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Egg3D } from '@/components/Egg3D'
import { Gremlin3D } from '@/components/Gremlin3D'
import { Countdown } from '@/components/Countdown'
import { Confetti } from '@/components/Confetti'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { soundEffects } from '@/lib/soundEffects'
import { useKV } from '@github/spark/hooks'
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'

type GremlinMood = 'happy' | 'lonely' | 'sleepy'

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isHatching, setIsHatching] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isWaving, setIsWaving] = useState(false)
  const [dismissedKeepPrompt, setDismissedKeepPrompt] = useState(false)
  const prevCrackLevel = useRef<number>(0)

  const [hasHatched, setHasHatched] = useKV<boolean>('hasHatched', true)
  const [crackLevel, setCrackLevel] = useKV<number>('crackLevel', 0)
  const [lastCrackTime, setLastCrackTime] = useKV<number>('lastCrackTime', Date.now())
  const [gremlinAlive, setGremlinAlive] = useKV<boolean>('gremlinAlive', false)
  const [lastVisit, setLastVisit] = useKV<number>('gremlinLastVisit', Date.now())
  const [soundEnabled, setSoundEnabled] = useKV<boolean>('soundEnabled', true)

  const CRACK_INTERVAL_MIN = 15 * 60 * 1000
  const CRACK_INTERVAL_MAX = 30 * 60 * 1000
  const MAX_CRACKS = 8

  const getMood = (): GremlinMood => {
    const hoursAway = (Date.now() - (lastVisit ?? Date.now())) / 36e5
    if (hoursAway < 24) return 'happy'
    if (hoursAway < 72) return 'lonely'
    return 'sleepy'
  }

  const gremlinMood = getMood()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (gremlinAlive) {
      const now = Date.now()
      setLastVisit(now)
    }
  }, [gremlinAlive, setLastVisit])

  useEffect(() => {
    if (hasHatched) return

    const now = Date.now()
    const timeSinceLastCrack = now - (lastCrackTime ?? now)
    const randomInterval = CRACK_INTERVAL_MIN + Math.random() * (CRACK_INTERVAL_MAX - CRACK_INTERVAL_MIN)

    if ((crackLevel ?? 0) < MAX_CRACKS && timeSinceLastCrack > randomInterval) {
      const newCrackLevel = (crackLevel ?? 0) + 1
      setCrackLevel(newCrackLevel)
      setLastCrackTime(now)
      if (soundEnabled) {
        soundEffects.playCrack()
      }
      
      if (newCrackLevel > prevCrackLevel.current) {
        toast('The egg cracks a little more...', {
          description: `${newCrackLevel} / ${MAX_CRACKS} cracks`,
          duration: 3000,
        })
        prevCrackLevel.current = newCrackLevel
      }
    }
  }, [currentTime, hasHatched, crackLevel, lastCrackTime, setCrackLevel, setLastCrackTime, soundEnabled, CRACK_INTERVAL_MIN, CRACK_INTERVAL_MAX])

  // Midnight hatch check
  useEffect(() => {
    if (hasHatched) return
    if (currentTime.getHours() === 0 && currentTime.getMinutes() === 0) {
      handleHatch()
    }
  }, [currentTime, hasHatched])

  const handleHatch = () => {
    setIsHatching(true)
    setShowConfetti(true)
    if (soundEnabled) {
      soundEffects.playHatch()
    }

    setTimeout(() => {
      setHasHatched(true)
      setIsHatching(false)

      setTimeout(() => {
        setShowConfetti(false)
      }, 4000)
    }, 2000)
  }

  const handleKeep = () => {
    const now = Date.now()
    setGremlinAlive(true)
    setLastVisit(now)
    toast.success('Your gremlin is now yours forever! 💜', {
      description: 'Come back often to keep them happy',
      duration: 4000,
    })
  }

  const handleSayHi = () => {
    const now = Date.now()
    setLastVisit(now)
    setIsWaving(true)
    setTimeout(() => setIsWaving(false), 1000)
  }

  const getTimeUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const diff = midnight.getTime() - now.getTime()

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { hours, minutes, seconds }
  }

  const handleForceHatch = () => {
    if (!hasHatched) {
      handleHatch()
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Toaster />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, oklch(0.25 0.15 290) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, oklch(0.20 0.12 340) 0%, transparent 50%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              oklch(0.18 0.09 285) 2px,
              oklch(0.18 0.09 285) 4px
            )
          `,
        }}
      />

      <Confetti show={showConfetti} />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSoundEnabled((prev) => !prev)}
        className="fixed top-4 right-4 z-50 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors"
        aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? (
          <SpeakerHigh className="text-foreground" size={24} weight="duotone" />
        ) : (
          <SpeakerSlash className="text-muted-foreground" size={24} weight="duotone" />
        )}
      </Button>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6 md:mb-8 px-4"
        >
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-3 md:mb-4">
            {hasHatched ? 'Happy New Year! 🎉' : 'A New Year Surprise'}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-body">
            {hasHatched ? '' : 'Something magical is about to happen...'}
          </p>
          {hasHatched && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 3, duration: 2 }}
              className="text-xs md:text-sm text-muted-foreground/70 font-body italic mt-3 md:mt-4"
            >
              From Ismael — made with love
            </motion.p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {!hasHatched ? (
            <motion.div
              key="egg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-8"
            >
              <Card className="p-6 md:p-12 bg-card/50 backdrop-blur-sm border-border/50 w-full max-w-lg">
                <div className="w-full h-80 md:h-96 flex items-center justify-center">
                  <Egg3D crackLevel={crackLevel ?? 0} isHatching={isHatching} />
                </div>
              </Card>

              {!isHatching && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Countdown timeUntilMidnight={getTimeUntilMidnight()} />
                  <Badge variant="secondary" className="text-sm px-4 py-2 font-body">
                    {crackLevel ?? 0} / {MAX_CRACKS} cracks
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="hatched"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-sm border-border/50 w-full max-w-lg">
                <div className="w-full h-80 md:h-96 flex items-center justify-center relative">
                  <Gremlin3D mood={gremlinMood} isWaving={isWaving} />
                </div>
              </Card>

              {/* Keep me? prompt - only shows if not yet kept and not dismissed */}
              {!gremlinAlive && !dismissedKeepPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <p className="text-base text-foreground/90 font-body text-center px-4">
                    Keep me? I'll live on your device 💜
                  </p>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button 
                      onClick={handleKeep} 
                      size="lg" 
                      variant="default"
                      className="min-w-[120px] transition-transform hover:scale-105 active:scale-95"
                      aria-label="Keep the gremlin as a pet"
                    >
                      Keep me!
                    </Button>
                    <Button 
                      onClick={() => setDismissedKeepPrompt(true)} 
                      size="lg" 
                      variant="outline"
                      className="min-w-[120px] transition-transform hover:scale-105 active:scale-95"
                      aria-label="Dismiss without keeping"
                    >
                      Just visiting
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Simple Say Hi button when kept - just one action */}
              {gremlinAlive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Button
                    onClick={handleSayHi}
                    size="lg"
                    variant="ghost"
                    className="text-foreground hover:text-accent hover:bg-accent/10 transition-all hover:scale-110 active:scale-95"
                    aria-label="Say hi to your gremlin"
                  >
                    Say Hi 👋
                  </Button>
                  {gremlinMood === 'lonely' && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground/70 italic font-body"
                    >
                      I missed you...
                    </motion.p>
                  )}
                  {gremlinMood === 'sleepy' && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground/70 italic font-body"
                    >
                      *yawns* ...you came back
                    </motion.p>
                  )}
                  {gremlinMood === 'happy' && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-accent/80 font-body font-medium"
                    >
                      So happy to see you! ✨
                    </motion.p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleForceHatch}
          className="fixed bottom-4 right-4 opacity-0 hover:opacity-10 transition-opacity w-16 h-16"
          title="Preview hatch (dev mode)"
        />
      </div>
    </div>
  )
}

export default App
