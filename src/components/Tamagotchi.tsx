import { Heart, ForkKnife, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PetStats {
  hunger: number
  happiness: number
  energy: number
}

interface TamagotchiProps {
  stats: PetStats
  onFeed: () => void
  onPlay: () => void
  onRest: () => void
}

export function Tamagotchi({ stats, onFeed, onPlay, onRest }: TamagotchiProps) {
  const getStatColor = (value: number) => {
    if (value > 70) return 'bg-green-500'
    if (value > 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-xl font-display font-bold mb-6 text-center">
        Pet Care
      </h3>

      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="text-accent" size={20} weight="fill" />
              <span className="text-sm font-body">Happiness</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{stats.happiness}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${getStatColor(stats.happiness)}`}
              style={{ width: `${stats.happiness}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ForkKnife className="text-secondary" size={20} weight="fill" />
              <span className="text-sm font-body">Hunger</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{100 - stats.hunger}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${getStatColor(100 - stats.hunger)}`}
              style={{ width: `${100 - stats.hunger}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkle className="text-primary" size={20} weight="fill" />
              <span className="text-sm font-body">Energy</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{stats.energy}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${getStatColor(stats.energy)}`}
              style={{ width: `${stats.energy}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={onFeed}
          variant="outline"
          size="sm"
          className="flex flex-col gap-1 h-auto py-3"
        >
          <ForkKnife size={24} weight="duotone" />
          <span className="text-xs">Feed</span>
        </Button>
        <Button
          onClick={onPlay}
          variant="outline"
          size="sm"
          className="flex flex-col gap-1 h-auto py-3"
        >
          <Heart size={24} weight="duotone" />
          <span className="text-xs">Play</span>
        </Button>
        <Button
          onClick={onRest}
          variant="outline"
          size="sm"
          className="flex flex-col gap-1 h-auto py-3"
        >
          <Sparkle size={24} weight="duotone" />
          <span className="text-xs">Rest</span>
        </Button>
      </div>
    </Card>
  )
}
