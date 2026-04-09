export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

export const useToast = () => {
  const toasts = useState<Toast[]>('toasts', () => [])

  const show = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 10)
    toasts.value.push({ id, type, message })
    setTimeout(() => dismiss(id), 4000)
  }

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    info: (msg: string) => show(msg, 'info'),
    warning: (msg: string) => show(msg, 'warning'),
    dismiss,
  }
}
