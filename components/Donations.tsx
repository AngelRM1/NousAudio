"use client";

import { useState } from "react";

/** Apoya NousAudio: donaciones voluntarias, sin bloquear funciones. */
export default function Donations() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
      >
        Apoya NousAudio
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-bold text-slate-900">Apoya NousAudio</p>
          <p className="mt-1 text-xs text-slate-500">
            Donaciones voluntarias. No bloquean ninguna función.
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <a
              href="https://paypal.me/engelarm"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-900 px-3 py-2 text-center font-bold text-white"
            >
              PayPal
            </a>
            <a
              href="https://buymeacoffee.com/engelarm"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-amber-400 px-3 py-2 text-center font-bold text-slate-900"
            >
              Buy Me a Coffee
            </a>
            <a
              href="https://nouslogic.xyz/dona-un-cafe"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-2 text-center font-bold text-slate-800"
            >
              nouslogic.xyz/dona-un-cafe
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
