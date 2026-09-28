import { Clock } from '@phosphor-icons/react'

interface CountdownProps {
  timeUntilMidnight: {
    hours: number
    minutes: number
    seconds: number
  }
}

export function Countdown({ timeUntilMidnight }: CountdownProps) {
  const { hours, minutes, seconds } = timeUntilMidnight

  return (
    <div className="flex items-center gap-2 md:gap-3 bg-muted/30 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full border border-border/50">
      <Clock className="text-accent flex-shrink-0" size={20} weight="duotone" />
      <div className="flex items-baseline gap-1 md:gap-2 font-body">
        <span className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
          {String(hours).padStart(2, '0')}
        </span>
        <span className="text-muted-foreground text-sm md:text-base">:</span>
        <span className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
          {String(minutes).padStart(2, '0')}
        </span>
        <span className="text-muted-foreground text-sm md:text-base">:</span>
        <span className="text-xl md:text-2xl font-bold text-foreground tabular-nums">
          {String(seconds).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider hidden sm:inline">
        until midnight
      </span>
    </div>
  )
}
