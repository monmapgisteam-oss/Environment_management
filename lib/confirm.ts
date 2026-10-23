// In-app replacement for window.confirm. Any client code awaits
// confirmDialog(...); the ConfirmDialog mounted in AppShell asks and resolves
// the promise with the user's answer. Like toast(), it is event based so plain
// handlers can use it without React context.

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Red confirm button for actions that delete or cannot be undone.
  danger?: boolean;
};

export type ConfirmRequest = ConfirmOptions & { resolve: (ok: boolean) => void };

export const CONFIRM_EVENT = 'app:confirm';

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const opts = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    const detail: ConfirmRequest = { ...opts, resolve };
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail }));
  });
}
