interface ToastProps {
  message: string
  onUndo?: () => void
}

export function Toast({ message, onUndo }: ToastProps) {
  return (
    <div className="animate-toast-in fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-cream shadow-lg">
        <span>{message}</span>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="font-semibold text-softpink transition-colors duration-150 hover:text-cream"
          >
            (undo)
          </button>
        )}
      </div>
    </div>
  )
}
