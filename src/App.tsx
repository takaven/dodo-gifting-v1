import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Confetti } from '@/components/Confetti'
import { Egg3D } from '@/components/Egg3D'
import { Gremlin3D } from '@/components/Gremlin3D'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Toaster } from '@/components/ui/sonner'
import { soundEffects } from '@/lib/soundEffects'

const intents = ['Celebrate', 'Love', 'Luck', 'Courage', 'Calm', 'Surprise'] as const

type Intent = typeof intents[number]
type Stage = 'SEALED' | 'HATCH_START' | 'EGG_EXIT' | 'DODO_ENTER' | 'MESSAGE_REVEAL' | 'RESULT'

interface PublicGift {
  id: string
  senderName: string
  recipientName: string
  intent: Intent
  message?: string
  unlockAt: string
  timezone: string
  parentGiftId?: string | null
  cancelledAt?: string | null
  hatchStartedAt?: string | null
  hatchCompletedAt?: string | null
  isUnlocked: boolean
  dodoId?: string
  dodoSeed?: string
}

interface ManageGift extends PublicGift {
  message: string
  recipientUrl: string
  manageUrl: string
  editable: boolean
}

interface CreateResult {
  gift: ManageGift
  recipientUrl: string
  manageUrl: string
}

interface FormState {
  senderName: string
  recipientName: string
  intent: Intent
  message: string
  openingChoice: 'now' | 'later'
  date: string
  time: string
  timezone: string
}

const defaultForm: FormState = {
  senderName: '',
  recipientName: '',
  intent: 'Courage',
  message: '',
  openingChoice: 'now',
  date: '',
  time: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || data.errors?.join(', ') || 'Request failed')
  return data
}

function currentRoute() {
  const recipient = window.location.pathname.match(/^\/g\/([^/]+)$/)
  const manage = window.location.pathname.match(/^\/manage\/([^/]+)$/)
  if (recipient) return { name: 'recipient' as const, token: recipient[1] }
  if (manage) return { name: 'manage' as const, token: manage[1] }
  return { name: 'compose' as const }
}

function unlockFromForm(form: FormState) {
  if (form.openingChoice === 'now') return new Date().toISOString()
  return new Date(`${form.date}T${form.time || '00:00'}`).toISOString()
}

function App() {
  const [route, setRoute] = useState(currentRoute())

  useEffect(() => {
    const onPop = () => setRoute(currentRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Toaster />
      <Background />
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        {route.name === 'compose' && <Composer />}
        {route.name === 'recipient' && <Recipient token={route.token} />}
        {route.name === 'manage' && <Manager token={route.token} />}
      </main>
    </div>
  )
}

function Background() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, oklch(0.28 0.13 185 / 0.45) 0%, transparent 36%),
          radial-gradient(circle at 80% 15%, oklch(0.38 0.14 20 / 0.34) 0%, transparent 34%),
          linear-gradient(160deg, oklch(0.14 0.06 270), oklch(0.17 0.07 220) 52%, oklch(0.20 0.08 140))
        `,
      }}
    />
  )
}

function Composer() {
  const params = new URLSearchParams(window.location.search)
  const parentGiftId = params.get('parentGiftId')
  const initial = useMemo<FormState>(() => ({
    ...defaultForm,
    intent: (params.get('intent') as Intent) || defaultForm.intent,
    senderName: params.get('senderName') || '',
  }), [])
  const [form, setForm] = useState<FormState>(initial)
  const [result, setResult] = useState<CreateResult | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    void api('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ eventName: 'composer_started', metadata: { parentGiftId } }),
    }).catch(() => undefined)
  }, [parentGiftId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const created = await api<CreateResult>('/api/gifts', {
        method: 'POST',
        body: JSON.stringify({
          senderName: form.senderName,
          recipientName: form.recipientName,
          intent: form.intent,
          message: form.message,
          unlockAt: unlockFromForm(form),
          timezone: form.timezone,
          parentGiftId,
        }),
      })
      setResult(created)
      toast.success('Gift created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create gift')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-5xl grid md:grid-cols-[1fr_1.1fr] gap-8 items-center">
      <div className="min-h-[320px] md:min-h-[520px]">
        <Egg3D crackLevel={0} isHatching={false} />
      </div>
      <Card className="p-5 md:p-7 bg-card/70 backdrop-blur border-border/60">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Send a Dodo gift</h1>
        <p className="text-muted-foreground mb-6">Create a sealed surprise with a private link.</p>
        {result ? (
          <CreatedGift result={result} />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Your name">
                <Input value={form.senderName} onChange={(event) => setForm({ ...form, senderName: event.target.value })} required maxLength={80} />
              </Field>
              <Field label="Recipient name">
                <Input value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} required maxLength={80} />
              </Field>
            </div>
            <Field label="Intent">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {intents.map((intent) => (
                  <button
                    type="button"
                    key={intent}
                    onClick={() => setForm({ ...form, intent })}
                    className={`rounded-md border px-3 py-2 text-sm ${form.intent === intent ? 'bg-accent text-accent-foreground border-accent' : 'bg-background/30 border-border'}`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Personal message">
              <Textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={500} rows={4} />
            </Field>
            <Field label="Opening">
              <div className="flex gap-3 flex-wrap">
                <Button type="button" variant={form.openingChoice === 'now' ? 'default' : 'outline'} onClick={() => setForm({ ...form, openingChoice: 'now' })}>Open now</Button>
                <Button type="button" variant={form.openingChoice === 'later' ? 'default' : 'outline'} onClick={() => setForm({ ...form, openingChoice: 'later' })}>Pick a moment</Button>
              </div>
            </Field>
            {form.openingChoice === 'later' && (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Date">
                  <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                </Field>
                <Field label="Time">
                  <Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
                </Field>
                <Field label="Timezone">
                  <Input value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} required />
                </Field>
              </div>
            )}
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Sealing...' : 'Seal gift'}
            </Button>
          </form>
        )}
      </Card>
    </section>
  )
}

function CreatedGift({ result }: { result: CreateResult }) {
  const origin = window.location.origin
  const recipientLink = `${origin}${result.recipientUrl}`
  const manageLink = `${origin}${result.manageUrl}`

  async function share() {
    await navigator.clipboard.writeText(recipientLink)
    await api('/api/analytics', { method: 'POST', body: JSON.stringify({ eventName: 'share_clicked', giftId: result.gift.id }) }).catch(() => undefined)
    toast.success('Recipient link copied')
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">Your gift is sealed for {result.gift.recipientName}.</p>
      <Field label="Recipient link">
        <Input readOnly value={recipientLink} />
      </Field>
      <Button onClick={share} className="w-full">Copy recipient link</Button>
      <Field label="Sender management link">
        <Input readOnly value={manageLink} />
      </Field>
    </div>
  )
}

function Recipient({ token }: { token: string }) {
  const [gift, setGift] = useState<PublicGift | null>(null)
  const [stage, setStage] = useState<Stage>('SEALED')
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await api<{ gift: PublicGift }>(`/api/gifts/recipient/${token}`)
      setGift(data.gift)
      if (data.gift.hatchCompletedAt) setStage('RESULT')
      else if (data.gift.hatchStartedAt) setStage('MESSAGE_REVEAL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gift not found')
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  async function hatch() {
    if (!gift?.isUnlocked) return
    await api(`/api/gifts/recipient/${token}/hatch-start`, { method: 'POST', body: '{}' })
    soundEffects.playHatch()
    setStage('HATCH_START')
    setTimeout(() => setStage('EGG_EXIT'), 900)
    setTimeout(() => setStage('DODO_ENTER'), 1500)
    setTimeout(() => setStage('MESSAGE_REVEAL'), 2200)
    setTimeout(async () => {
      const data = await api<{ gift: PublicGift }>(`/api/gifts/recipient/${token}/hatch-complete`, { method: 'POST', body: '{}' })
      setGift(data.gift)
      setStage('RESULT')
    }, 3000)
  }

  if (error) return <Card className="p-6 bg-card/70">{error}</Card>
  if (!gift) return <Card className="p-6 bg-card/70">Loading gift...</Card>
  if (gift.cancelledAt) return <Card className="p-6 bg-card/70">This gift was cancelled.</Card>

  return (
    <section className="w-full max-w-4xl flex flex-col items-center text-center gap-6">
      <Confetti show={stage === 'RESULT'} />
      <h1 className="text-3xl md:text-5xl font-display font-bold">
        {gift.senderName} sent {gift.recipientName} some {gift.intent.toLowerCase()}.
      </h1>
      {!gift.isUnlocked ? <LockedGift gift={gift} /> : <Reveal gift={gift} stage={stage} onHatch={hatch} />}
    </section>
  )
}

function LockedGift({ gift }: { gift: PublicGift }) {
  return (
    <>
      <div className="w-full max-w-md h-[360px]">
        <Egg3D crackLevel={0} isHatching={false} />
      </div>
      <Card className="p-5 bg-card/70 backdrop-blur">
        <p className="text-lg">This sealed gift opens at:</p>
        <p className="text-2xl font-bold tabular-nums">{new Date(gift.unlockAt).toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{gift.timezone}</p>
      </Card>
    </>
  )
}

function Reveal({ gift, stage, onHatch }: { gift: PublicGift; stage: Stage; onHatch: () => void }) {
  const showingEgg = stage === 'SEALED' || stage === 'HATCH_START' || stage === 'EGG_EXIT'
  const showingDodo = stage === 'DODO_ENTER' || stage === 'MESSAGE_REVEAL' || stage === 'RESULT'

  return (
    <>
      <div className="w-full max-w-md h-[360px]">
        <AnimatePresence mode="wait">
          {showingEgg && (
            <motion.div key="egg" exit={{ opacity: 0, scale: 0.8 }} className="w-full h-full">
              <Egg3D crackLevel={stage === 'SEALED' ? 0 : 8} isHatching={stage !== 'SEALED'} />
            </motion.div>
          )}
          {showingDodo && (
            <motion.div key="dodo" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full">
              <Gremlin3D mood="happy" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {stage === 'SEALED' && (
        <button
          type="button"
          onClick={onHatch}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Hatch
        </button>
      )}
      {(stage === 'MESSAGE_REVEAL' || stage === 'RESULT') && (
        <Card className="p-6 bg-card/70 backdrop-blur max-w-xl w-full">
          <p className="text-lg mb-3">{gift.senderName} sent you some {gift.intent.toLowerCase()}.</p>
          {gift.message && <p className="text-2xl font-display mb-5">{gift.message}</p>}
          <p className="text-sm text-muted-foreground mb-5">Delivered by {gift.dodoId}</p>
          <Button onClick={() => onward(gift)}>Send some {gift.intent.toLowerCase()}</Button>
        </Card>
      )}
    </>
  )
}

function onward(gift: PublicGift) {
  void api('/api/analytics', { method: 'POST', body: JSON.stringify({ eventName: 'onward_create_clicked', giftId: gift.id }) }).catch(() => undefined)
  const params = new URLSearchParams({
    intent: gift.intent,
    senderName: gift.recipientName,
    parentGiftId: gift.id,
  })
  window.history.pushState({}, '', `/?${params.toString()}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function Manager({ token }: { token: string }) {
  const [gift, setGift] = useState<ManageGift | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [error, setError] = useState('')

  async function load() {
    const data = await api<{ gift: ManageGift }>(`/api/gifts/manage/${token}`)
    setGift(data.gift)
    const unlock = new Date(data.gift.unlockAt)
    setForm({
      senderName: data.gift.senderName,
      recipientName: data.gift.recipientName,
      intent: data.gift.intent,
      message: data.gift.message,
      openingChoice: 'later',
      date: unlock.toISOString().slice(0, 10),
      time: unlock.toISOString().slice(11, 16),
      timezone: data.gift.timezone,
    })
  }

  useEffect(() => {
    void load().catch((err) => setError(err.message))
  }, [token])

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await api<{ gift: ManageGift }>(`/api/gifts/manage/${token}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...form, unlockAt: unlockFromForm(form) }),
      })
      setGift(data.gift)
      toast.success('Gift updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update gift')
    }
  }

  async function cancel() {
    await api(`/api/gifts/manage/${token}`, { method: 'DELETE' })
    toast.success('Gift cancelled')
    await load()
  }

  if (error) return <Card className="p-6 bg-card/70">{error}</Card>
  if (!gift) return <Card className="p-6 bg-card/70">Loading management link...</Card>

  return (
    <Card className="p-5 md:p-7 bg-card/70 backdrop-blur border-border/60 w-full max-w-2xl">
      <h1 className="text-3xl font-display font-bold mb-2">Manage gift</h1>
      {!gift.editable && <p className="mb-4 text-secondary">This gift is frozen because hatching has started.</p>}
      {gift.cancelledAt && <p className="mb-4 text-destructive">This gift is cancelled.</p>}
      <form onSubmit={save} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Sender"><Input disabled={!gift.editable} value={form.senderName} onChange={(event) => setForm({ ...form, senderName: event.target.value })} /></Field>
          <Field label="Recipient"><Input disabled={!gift.editable} value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} /></Field>
        </div>
        <Field label="Message"><Textarea disabled={!gift.editable} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Date"><Input disabled={!gift.editable} type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          <Field label="Time"><Input disabled={!gift.editable} type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></Field>
          <Field label="Timezone"><Input disabled={!gift.editable} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} /></Field>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button disabled={!gift.editable || Boolean(gift.cancelledAt)} type="submit">Save</Button>
          <Button disabled={!gift.editable || Boolean(gift.cancelledAt)} type="button" variant="destructive" onClick={cancel}>Cancel gift</Button>
        </div>
      </form>
      <div className="mt-5">
        <Field label="Recipient link">
          <Input readOnly value={`${window.location.origin}${gift.recipientUrl}`} />
        </Field>
      </div>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default App
