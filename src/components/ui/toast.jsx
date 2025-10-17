import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { X, CheckCircle, XCircle, Info } from "lucide-react"

const toastVariants = cva(
  "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5 backdrop-blur-2xl",
  {
    variants: {
      variant: {
        default: "bg-white/90 border-white/90",
        success: "bg-green-500/90 border-green-400/90",
        error: "bg-red-500/90 border-red-400/90",
        info: "bg-blue-500/90 border-blue-400/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  default: Info,
}

const iconColorMap = {
  success: "text-white",
  error: "text-white",
  info: "text-white",
  default: "text-white",
}

export function Toast({ variant = "default", title, description, onClose }) {
  const Icon = iconMap[variant]

  return (
    <div className={cn(toastVariants({ variant }))}>
      <Icon className={cn("w-5 h-5 flex-shrink-0 drop-shadow-md", iconColorMap[variant])} />
      <div className="flex-1">
        {title && (
          <div className="text-sm font-semibold text-white drop-shadow-md">{title}</div>
        )}
        {description && (
          <div className="text-sm text-white/90 mt-0.5 drop-shadow-sm">{description}</div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
