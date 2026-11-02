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
  // Asks for a required text (e.g. a reason) as well; see promptDialog.
  input?: { label: string; placeholder?: string };
};

export type ConfirmRequest = ConfirmOptions & { resolve: (ok: boolean, text?: string) => void };

export const CONFIRM_EVENT = 'app:confirm';

// Like confirmDialog, with a required text field. Resolves to the trimmed
// text, or null when cancelled.
export function promptDialog(options: ConfirmOptions & { input: NonNullable<ConfirmOptions['input']> }): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const detail: ConfirmRequest = { ...options, resolve: (ok, text) => resolve(ok ? text ?? '' : null) };
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail }));
  });
}

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const opts = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    const detail: ConfirmRequest = { ...opts, resolve };
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail }));
  });
}
