import { useEffect, useState } from 'react'
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/push'
import { BellIcon } from './icons'

export function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSupported(isPushSupported())
    getExistingSubscription().then((s) => setSubscribed(Boolean(s)))
  }, [])

  if (!supported) return null

  async function handleClick() {
    setBusy(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        const sub = await subscribeToPush()
        setSubscribed(Boolean(sub))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 px-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`flex items-center gap-2 rounded-lg py-1.5 text-left text-xs transition-colors duration-150 ${
          subscribed
            ? 'text-raspberry'
            : 'text-ink/50 hover:text-ink/70 dark:text-ink-dark/50 dark:hover:text-ink-dark/70'
        }`}
      >
        <BellIcon size={12} />
        {subscribed ? 'notifications on' : 'enable notifications'}
      </button>
      <p className="text-[10px] leading-snug text-ink/30 dark:text-ink-dark/30">
        iOS: only fires once TaaDaa is added to your home screen — not in a regular Safari tab.
      </p>
    </div>
  )
}
