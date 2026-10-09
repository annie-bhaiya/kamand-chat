'use client';

import { Ellipsis } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function ChatContextTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <>
    <div className="chat-context-desktop">{children}</div>
    <div className="chat-context-mobile" ref={root}>
      <button ref={trigger} type="button" className="btn-icon btn-ghost" aria-label="Campus tools" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><Ellipsis size={20} /></button>
      {open && <div id={id} className="chat-tools-panel" role="group" aria-label="Campus tools" onClick={event => { if ((event.target as HTMLElement).closest('button')) setOpen(false); }}>{children}</div>}
    </div>
  </>;
}
