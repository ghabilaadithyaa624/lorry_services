import { create } from 'zustand'

/**
 * Toast notification type options.
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Toast item interface representing an active notification.
 */
export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

/**
 * Zustand store state and action definitions for toast management.
 */
interface ToastStoreState {
  toasts: ToastItem[]
  addToast: (type: ToastType, message: string, duration?: number) => string
  dismiss: (id: string) => void
}

/**
 * Zustand hook store for managing global toast notifications.
 */
export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (type: ToastType, message: string, duration = 4000): string => {
    const id = crypto.randomUUID()
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }))
    return id
  },

  dismiss: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

/**
 * Convenience helper methods for triggering toasts outside React components or directly in handlers.
 */
export const toast = {
  /**
   * Show a success toast notification.
   */
  success: (message: string, duration?: number): string =>
    useToastStore.getState().addToast('success', message, duration),

  /**
   * Show an error toast notification.
   */
  error: (message: string, duration?: number): string =>
    useToastStore.getState().addToast('error', message, duration),

  /**
   * Show an informational toast notification.
   */
  info: (message: string, duration?: number): string =>
    useToastStore.getState().addToast('info', message, duration),

  /**
   * Show a warning toast notification.
   */
  warning: (message: string, duration?: number): string =>
    useToastStore.getState().addToast('warning', message, duration),

  /**
   * Dismiss an active toast by ID.
   */
  dismiss: (id: string): void => useToastStore.getState().dismiss(id),
}
