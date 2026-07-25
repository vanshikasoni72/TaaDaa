import { useEffect, useState } from 'react'
import type { TaskList } from '../types'

interface ListsDrawerProps {
  lists: TaskList[]
  addList: (name: string) => string | null
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => void
  addItem: (listId: string, text: string) => void
  toggleItem: (listId: string, itemId: string) => void
  clearChecked: (listId: string) => void
  onClose: () => void
}

// Generalized version of the old single-purpose ShoppingDrawer — same slide-in
// panel, same isolation from the task engine, but now holds any number of
// named checklists instead of one hardcoded shopping list. `lists` and its
// mutators are lifted up to App.tsx (via useLists there) rather than owned
// here, so cross-device sync can push/pull them the same way it does
// tasks/projects — this component would otherwise unmount/remount every time
// the drawer closes, losing any state App.tsx needed to observe continuously.
// Two screens inside one drawer: a list-of-lists picker, and a single list's
// items — swapped via `selectedListId` rather than two components, to keep
// the open/close animation and backdrop shared.
export function ListsDrawer({
  lists,
  addList,
  renameList,
  deleteList,
  addItem,
  toggleItem,
  clearChecked,
  onClose,
}: ListsDrawerProps) {
  const [open, setOpen] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [itemValue, setItemValue] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function requestClose() {
    setOpen(false)
    setTimeout(onClose, 200)
  }

  function submitNewList(e: React.FormEvent) {
    e.preventDefault()
    const id = addList(newListName)
    setNewListName('')
    if (id) setSelectedListId(id)
  }

  function startRename(id: string, name: string) {
    setRenamingId(id)
    setRenameValue(name)
  }

  function commitRename() {
    if (renamingId) renameList(renamingId, renameValue)
    setRenamingId(null)
    setRenameValue('')
  }

  function handleDeleteList(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and everything on it?`)) return
    deleteList(id)
    if (selectedListId === id) setSelectedListId(null)
  }

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null

  function submitItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedList) return
    addItem(selectedList.id, itemValue)
    setItemValue('')
  }

  const unchecked = selectedList ? selectedList.items.filter((i) => !i.checked).sort((a, b) => a.createdAt - b.createdAt) : []
  const checked = selectedList ? selectedList.items.filter((i) => i.checked).sort((a, b) => a.createdAt - b.createdAt) : []
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
        {selectedList ? (
          <>
            <div className="flex items-center gap-2 px-4 pt-6">
              <button
                type="button"
                onClick={() => setSelectedListId(null)}
                aria-label="Back to all lists"
                className="text-lg text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
              >
                ‹
              </button>
              <h2 className="flex-1 truncate font-serif text-xl italic text-heading">{selectedList.name}</h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close lists"
                className="text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitItem} className="px-4 pt-4">
              <input
                autoFocus
                type="text"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
                placeholder="add an item…"
                className="w-full rounded-xl border border-quickadd-border bg-quickadd px-3 py-2 text-sm text-ink placeholder:text-ink/35 outline-none focus:border-raspberry/40 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
              />
            </form>

            <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
              {selectedList.items.length === 0 ? (
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
                        onClick={() => toggleItem(selectedList.id, item.id)}
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
                          onClick={() => toggleItem(selectedList.id, item.id)}
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
                onClick={() => clearChecked(selectedList.id)}
                className="mx-4 mb-6 rounded-xl border border-ink/10 py-2 text-xs font-medium text-ink/50 transition-colors duration-150 hover:border-raspberry/40 hover:text-raspberry dark:border-border dark:text-ink-dark/50"
              >
                Clear Checked
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 pt-6">
              <h2 className="font-serif text-xl italic text-heading">Lists</h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close lists"
                className="text-ink/40 transition-colors duration-150 hover:text-raspberry dark:text-ink-dark/40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewList} className="px-4 pt-4">
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="new list…"
                className="w-full rounded-xl border border-quickadd-border bg-quickadd px-3 py-2 text-sm text-ink placeholder:text-ink/35 outline-none focus:border-raspberry/40 dark:text-ink-dark dark:placeholder:text-ink-dark/35"
              />
            </form>

            <div className="mt-4 flex-1 overflow-y-auto px-4 pb-4">
              {lists.length === 0 ? (
                <p className="px-1 py-8 text-center text-sm italic text-ink/40 dark:text-ink-dark/40">
                  No lists yet. Shopping, packing, whatever — start one above.
                </p>
              ) : (
                <div className="flex flex-col">
                  {lists.map((list) => {
                    const pending = list.items.filter((i) => !i.checked).length
                    return (
                      <div key={list.id} className="group flex items-center border-b border-ink/[0.06] dark:border-white/[0.04]">
                        {renamingId === list.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                            className="my-1.5 w-full flex-1 rounded-lg border border-raspberry/40 bg-white/60 px-2 py-1 text-sm text-ink outline-none dark:bg-transparent dark:text-ink-dark"
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedListId(list.id)}
                              className="flex flex-1 items-center gap-2 py-2.5 text-left text-sm text-ink transition-colors duration-150 hover:text-raspberry dark:text-ink-dark"
                            >
                              <span className="flex-1 truncate">{list.name}</span>
                              {pending > 0 && <span className="text-xs text-ink/30 dark:text-ink-dark/30">{pending}</span>}
                            </button>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => startRename(list.id, list.name)}
                                aria-label={`Rename ${list.name}`}
                                className="px-1 text-xs text-ink/30 hover:text-rose dark:text-ink-dark/30"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteList(list.id, list.name)}
                                aria-label={`Delete ${list.name}`}
                                className="px-1 text-xs text-ink/30 hover:text-raspberry dark:text-ink-dark/30"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
