# Planning Guide

A delightful New Year's greeting card experience where an egg slowly cracks over time, hatching a gremlin exactly at midnight to deliver personalized wishes, with an optional Tamagotchi-style pet care game.

**Experience Qualities**:
1. **Anticipatory** - The slow cracking builds excitement and suspense as users check back throughout the day
2. **Magical** - The midnight hatching moment feels special and celebratory with delightful animations
3. **Endearing** - The gremlin character and pet care mechanics create emotional attachment

**Complexity Level**: Light Application (multiple features with basic state)
- This involves time-based state management, animations, and optional pet care mechanics, but remains focused on a singular cohesive experience

## Recent Improvements (Latest Iteration)

**Data Persistence Migration**
- Migrated from localStorage to `useKV` hook for proper, reliable state persistence
- All user data now properly syncs across sessions with functional state updates
- Eliminates data loss issues and improves reliability

**Enhanced User Experience**
- Added sound toggle button with persistent preferences
- Implemented toast notifications for crack events and keeping the gremlin
- Improved button interactions with scale animations and better feedback
- Enhanced "Keep me?" flow with clearer messaging and better visual hierarchy

**Mobile Responsiveness**
- Optimized countdown component for small screens
- Improved touch targets (minimum 44x44px)
- Better responsive card padding and sizing
- Adaptive typography scaling across breakpoints

**Accessibility Improvements**
- Added ARIA labels to all interactive elements
- Improved focus states and keyboard navigation
- Better semantic HTML structure
- Enhanced contrast ratios for text elements

**Performance & Polish**
- Added loading states for 3D canvases with spinner
- Smooth transitions between all states
- Better error handling and fallbacks
- Optimized animation performance

## Essential Features

**Time-Synced Egg Cracking**
- Functionality: 3D egg visual progressively shows more cracks based on real-time, rendered using Three.js with AI-generated geometry
- Purpose: Creates anticipation and rewards users who check back throughout the day
- Trigger: Automatic based on system time, crack appears every 15-30 minutes
- Progression: User views 3D egg → Time passes → New crack appears with animation → User notices change → Cycle repeats
- Success criteria: Cracks accumulate correctly, persist across page refreshes, visually progress toward hatching with realistic 3D rendering

**Midnight Hatching Event**
- Functionality: At exactly midnight on New Year's, the egg hatches revealing a 3D animated gremlin
- Purpose: Delivers the core "happy new year" message at the perfect moment
- Trigger: System clock reaches midnight (00:00)
- Progression: Midnight strikes → 3D egg shakes dramatically → Shell breaks apart → 3D gremlin emerges with animation → "Happy New Year from Ismael" message displays
- Success criteria: Triggers precisely at midnight, animation is smooth and celebratory, message is clear

**AI-Generated 3D Models**
- Functionality: Uses LudoAI (Spark LLM) to generate detailed 3D geometry specifications for both egg and gremlin
- Purpose: Creates unique, procedurally-enhanced 3D models with realistic materials and lighting
- Trigger: Component mount, one-time generation cached
- Progression: Component loads → AI prompt sent → JSON geometry spec received → Three.js renders 3D model
- Success criteria: Models generate successfully, look visually appealing, perform smoothly in browser

**Post-Hatch Pet Care**
- Functionality: After hatching, user can choose to keep and care for the 3D gremlin Tamagotchi-style
- Purpose: Extends engagement beyond the one-time greeting
- Trigger: User clicks "Keep Your Gremlin" button after hatching
- Progression: Hatching completes → Choice presented → User accepts → 3D gremlin becomes interactive pet → User feeds/plays/cares for pet → Stats update
- Success criteria: Pet state persists, interactions feel responsive, stats change meaningfully

**Pre-Midnight Preview Mode**
- Functionality: Allow testing of hatching animation before midnight for development/preview
- Purpose: Enable user to see the full experience without waiting
- Trigger: Hidden button or keyboard shortcut
- Progression: User activates preview → Hatching sequence plays → Returns to current state
- Success criteria: Preview doesn't affect actual egg state, can be triggered multiple times

## Edge Case Handling

- **Midnight Already Passed**: If user opens card after midnight, show hatched gremlin immediately with greeting
- **Time Zone Handling**: Use local system time for midnight detection, ensuring it works globally
- **Page Not Open at Midnight**: Store hatch status, show hatched state when user returns
- **Multiple Visits**: Preserve egg crack progress and pet state across sessions
- **Pet Neglect**: If pet mode activated, allow stats to decrease but don't "kill" the pet (keep it wholesome)
- **Browser Clock Changes**: Handle edge cases where system time jumps forward/backward gracefully

## Design Direction

The design should evoke wonder, warmth, and playful mischief - like discovering a magical creature. It should feel like a precious gift that unfolds over time, with personality and charm throughout. The 3D models add depth and realism, making the egg feel tangible and the gremlin feel alive.

## Color Selection

A mystical, warm color scheme that transitions from anticipatory (pre-hatch) to celebratory (post-hatch).

- **Primary Color**: Deep twilight purple `oklch(0.35 0.15 290)` - conveys magic and the special nature of the countdown
- **Secondary Colors**: 
  - Warm amber `oklch(0.75 0.15 70)` for the egg shell and warm accents
  - Soft cream `oklch(0.95 0.02 85)` for highlights and the inner egg
- **Accent Color**: Vibrant festive magenta `oklch(0.65 0.25 340)` - for the gremlin, celebration effects, and CTAs
- **Foreground/Background Pairings**:
  - Background (Deep Space) `oklch(0.15 0.08 280)`: Cream text `oklch(0.95 0.02 85)` - Ratio 11.2:1 ✓
  - Primary (Twilight Purple) `oklch(0.35 0.15 290)`: White text `oklch(1 0 0)` - Ratio 7.8:1 ✓
  - Accent (Festive Magenta) `oklch(0.65 0.25 340)`: White text `oklch(1 0 0)` - Ratio 4.6:1 ✓

## Font Selection

Typefaces should balance whimsy with readability - playful enough for the magical theme but clear enough for the caring message.

- **Primary Font**: Space Grotesk - Technical yet friendly, perfect for the countdown and UI elements
- **Accent Font**: Crimson Pro - Editorial warmth for the personal message from Ismael

**Typographic Hierarchy**:
- H1 (Greeting Message): Crimson Pro Bold/36px/loose letter spacing
- H2 (Section Headers): Space Grotesk Bold/24px/normal spacing
- Body (Instructions/Stats): Space Grotesk Regular/16px/relaxed line height
- Caption (Timestamps): Space Grotesk Medium/12px/uppercase/wide spacing

## Animations

Animations should enhance the magical, living quality of the experience - subtle breathing and anticipatory movements before midnight, then explosive joy at the hatch.

Key animation moments:
- **Egg Idle**: Gentle floating/breathing animation to show it's "alive"
- **New Crack**: Quick shimmer effect with subtle shake when crack appears
- **Pre-Hatch (5 min to midnight)**: Increasingly intense wobbling and glowing
- **Hatching**: Dramatic shake, shell fragments with physics, gremlin emergence with bounce
- **Gremlin Idle**: Blinking, slight movements, reactive to hover
- **Pet Interactions**: Bouncy feedback when fed/petted, happy wiggle animations

## Component Selection

**Components**:
- **Card**: For the main egg container and post-hatch message display
- **Button**: For "Keep Pet" CTA and pet interaction buttons (feed, play, etc.)
- **Progress**: For pet stats (hunger, happiness, energy) if kept
- **Dialog**: For the hatching celebration message overlay
- **Tabs**: For switching between pet care actions if feature is activated
- **Badge**: For displaying crack count or time until midnight
- **Avatar**: For displaying the gremlin character in various states

**Customizations**:
- **Custom 3D Egg Component**: Three.js rendered egg with AI-generated geometry, dynamic crack overlays, physically-based materials
- **Custom 3D Gremlin Character**: Three.js rendered creature with AI-generated geometry, multiple expression states, and mood-based animations
- **AI Geometry Generation**: Uses Spark LLM to generate detailed 3D model specifications in JSON format
- **Particle System**: For confetti/sparkles during hatching using framer-motion or CSS
- **Time Display**: Custom countdown component showing time until midnight

**States**:
- Buttons: Prominent hover scale (1.05), active press (0.95), subtle glow on primary CTA
- 3D Egg: Idle rotation with floating animation, hover subtle grow, crack appearance with glow effect
- 3D Gremlin: Multiple expression states (happy, hungry, playful, sleepy), smooth mood-based animations, interactive hover/click
- Progress bars: Animated fill with color shifts based on stat levels

**Icon Selection**:
- **Clock** (for countdown): Clock icon from Phosphor
- **Heart** (for happiness stat): Heart icon
- **ForkKnife** (for feeding): ForkKnife icon  
- **Sparkle** (for play/energy): Sparkle icon
- **Check** (for accepting pet): Check icon

**Spacing**:
- Card padding: p-8 on desktop, p-6 on mobile
- Button groups: gap-4
- Stat display: gap-6 for vertical list, gap-3 for compact horizontal
- Gremlin to message: gap-8 to give breathing room

**Mobile**:
- Egg scales down proportionally, remains centered
- Stats stack vertically instead of grid
- Buttons full-width on mobile for easier tapping
- Message text reduces from 36px to 28px
- Reduce overall padding to maximize content area
