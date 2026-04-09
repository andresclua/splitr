export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  resolve: ((val: boolean) => void) | null
}

export const useConfirm = () => {
  const state = useState<ConfirmState>('confirm', () => ({
    open: false,
    options: { title: '' },
    resolve: null,
  }))

  const ask = (options: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => {
      state.value = { open: true, options, resolve }
    })

  const accept = () => {
    state.value.resolve?.(true)
    state.value.open = false
  }

  const cancel = () => {
    state.value.resolve?.(false)
    state.value.open = false
  }

  return { state, ask, accept, cancel }
}
