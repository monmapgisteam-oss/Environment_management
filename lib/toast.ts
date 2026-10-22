// Fire-and-forget notifications for the signed-in UI. Any client code calls
// toast(...); the Toaster mounted in AppShell shows it. Events keep this free
// of React context, so hooks and plain handlers can use it alike.

export type ToastKind = 'success' | 'error' | 'info';
export type ToastMessage = { id: number; kind: ToastKind; message: string };

export const TOAST_EVENT = 'app:toast';

let nextId = 1;

export function toast(message: string, kind: ToastKind = 'success') {
  if (typeof window === 'undefined') return;
  const detail: ToastMessage = { id: nextId++, kind, message };
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail }));
}
