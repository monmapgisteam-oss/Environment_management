import { toast } from '@/lib/toast';

// How long the "Буцаах" button stays on the toast. The server accepts the undo
// token a little longer (lib/reports/undo.ts).
export const UNDO_TOAST_MS = 10_000;

// Confirms an action with a toast that can take it back. Without a token (the
// action cannot be undone) it is a plain success toast. `onUndone` runs after
// a successful undo, e.g. to refresh the page or go back to the form.
export function offerUndo(message: string, token: string | null | undefined, onUndone?: () => void) {
  if (!token) {
    toast(message);
    return;
  }
  toast(message, 'success', {
    durationMs: UNDO_TOAST_MS,
    action: {
      label: 'Буцаах',
      onClick: async () => {
        try {
          const res = await fetch('/api/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast(data.error || 'Буцаахад алдаа гарлаа.', 'error');
            return;
          }
          toast('Үйлдлийг буцаалаа.', 'info');
          onUndone?.();
        } catch {
          toast('Буцаахад алдаа гарлаа.', 'error');
        }
      },
    },
  });
}
