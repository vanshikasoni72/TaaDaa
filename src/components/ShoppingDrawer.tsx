import { useEffect, useState } from 'react'
import { useShoppingItems } from '../lib/useShoppingItems'

interface ShoppingDrawerProps {
  onClose: () => void
}

// Fully isolated from the task engine — its own store (useShoppingItems),
// its own UI, never rendered inside or read by Inbox/Today/Upcoming/
// Calendar. Just a slide-in checklist panel.
export function ShoppingDrawer({ onClose }: ShoppingDrawerProps) {
  const { items, addItem, toggleItem, clearChecked } = useShoppingItems()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function requestClose() {
    setOpen(false)
    setTimeout(onClose, 200)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addItem(value)
    setValue('')
  }

  const unchecked = items.filter((i) => !i.checked).sort((a, b) => a.createdAt - b.createdAt)
  const checked = items.filter((i) => i.checked).sort((a, b) => a.createdAt - b.createdAt)
  const hasChecked = checked.length > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 dark:bg-black/60 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={requestClose}
      />
      <aside
        className={`relative flex h-full w-full max-w-[350px] flex-col border-l border-border bg-cream shadow-xl transition-transform duration-200 ease-out dark:border-white/[0.08] dark:bg-cream-dark/95 dark:backdrop-blur-lg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-6">
          <h2 className="font-serif text-xl italic text-heading">Shopping</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close shopping list"
            className="text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pt-4">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="add an item…"
            className="w-full rounded-xl border border-quickadd-border bg-quickadd px-3 py-2 text-sm text-ink placeholder:text-ink/35 outline-none focus:border-raspberry/40 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
          />
        </form>

        <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
          {items.length === 0 ? (
            <p className="px-1 py-8 text-center text-sm italic text-ink/40 dark:text-ink-dark/40">
              Nothing on the list. For now.
            </p>
          ) : (
            <>
              <div className="flex flex-col">
                {unchecked.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="flex items-center gap-3 border-b border-ink/[0.06] py-2.5 text-left text-sm text-ink transition-colors duration-150 hover:text-raspberry dark:border-white/[0.04] dark:text-ink-dark"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-ink/30 dark:border-ink-dark/30" />
                    <span className="flex-1 truncate">{item.text}</span>
                  </button>
                ))}
              </div>

              {hasChecked && (
                <div className="mt-4 flex flex-col opacity-70">
                  {checked.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center gap-3 border-b border-ink/[0.06] py-2.5 text-left text-sm text-ink/50 transition-all duration-300 dark:border-white/[0.04] dark:text-ink-dark/50"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose/70 text-[9px] text-cream">
                        ✓
                      </span>
                      <span className="flex-1 truncate line-through decoration-ink/40">{item.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {hasChecked && (
          <button
            type="button"
            onClick={clearChecked}
            className="mx-4 mb-6 rounded-xl border border-ink/10 py-2 text-xs font-medium text-ink/50 transition-colors duration-150 hover:border-raspberry/40 hover:text-raspberry dark:border-border dark:text-ink-dark/50"
          >
            Clear Checked
          </button>
        )}
      </aside>
    </div>
  )
}
