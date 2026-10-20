"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineQuestionMarkCircle, HiX } from "react-icons/hi";

// Sidebar "Санал хүсэлт" action. Opens a small dialog where the logged-in
// user can write a message that is delivered to the system admin(s) via the
// notification system (POST /api/support).
export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (sending) return;
    setOpen(false);
    setError("");
    setSent(false);
    setMessage("");
  };

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        setMessage("");
      } else {
        setError(data.error || "Илгээхэд алдаа гарлаа.");
      }
    } catch {
      setError("Илгээхэд алдаа гарлаа.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
      >
        <HiOutlineQuestionMarkCircle size={18} className="flex-shrink-0" />
        <span className="truncate">Санал хүсэлт</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Санал хүсэлт</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Системийн админд зурвас илгээнэ үү.
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Хаах"
              >
                <HiX size={18} />
              </button>
            </div>

            {sent ? (
              <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700">
                Таны зурвас системийн админд амжилттай илгээгдлээ.
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Асуудал, санал хүсэлтээ энд бичнэ үү..."
                  className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
                {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
              </>
            )}

            <div className="mt-5 flex gap-3">
              {sent ? (
                <button
                  onClick={close}
                  className="flex-1 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115E59]"
                >
                  Хаах
                </button>
              ) : (
                <>
                  <button
                    onClick={send}
                    disabled={sending || !message.trim()}
                    className="flex-1 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-50"
                  >
                    {sending ? "Илгээж байна..." : "Илгээх"}
                  </button>
                  <button
                    onClick={close}
                    disabled={sending}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Цуцлах
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
