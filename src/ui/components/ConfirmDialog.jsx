import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { AlertIcon, XIcon } from './icons.jsx'

/**
 * In-app confirmation dialog. `danger` switches the confirm button to the
 * destructive style; Escape cancels.
 */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel, danger = false, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal((
    <div className="skm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onCancel() }}>
      <div className={`skm-dialog skm-confirm${danger ? ' is-danger' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="skm-dialogHead">
          <span className="skm-dialogIcon">{danger ? <AlertIcon size={18} /> : null}</span>
          <h2>{title}</h2>
          <button className="skm-iconBtn" type="button" onClick={onCancel} aria-label="Close"><XIcon /></button>
        </header>
        <div className="skm-dialogBody">{children}</div>
        <footer className="skm-dialogFoot">
          <button className="skm-btn" type="button" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button
            className={`skm-btn ${danger ? 'is-danger' : 'is-primary'}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  ), document.body)
}
