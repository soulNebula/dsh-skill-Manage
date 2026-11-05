import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { BookIcon, CopyIcon, XIcon } from './icons.jsx'

export function GuideDialog({ api, t, onClose }) {
  const [state, setState] = useState({ loading: true, text: '', path: '', error: '' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.call('guide/read')
      .then(result => { if (!cancelled) setState({ loading: false, text: result.text, path: result.path, error: '' }) })
      .catch(error => { if (!cancelled) setState({ loading: false, text: '', path: '', error: error.message }) })
    return () => { cancelled = true }
  }, [api])

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyGuide() {
    if (!state.text) return
    try {
      await navigator.clipboard.writeText(state.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return createPortal((
    <div className="skm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="skm-dialog skm-guideDialog" role="dialog" aria-modal="true" aria-label={t('guideTitle')}>
        <header className="skm-dialogHead">
          <span className="skm-dialogIcon"><BookIcon size={18} /></span>
          <h2>{t('guideTitle')}</h2>
          <button className="skm-btn is-small" type="button" onClick={copyGuide} disabled={!state.text}>
            <CopyIcon size={14} />{copied ? t('copied') : t('guideCopy')}
          </button>
          <button className="skm-iconBtn" type="button" onClick={onClose} aria-label={t('close')}><XIcon /></button>
        </header>
        <div className="skm-guideBody">
          {state.loading && <p className="skm-muted">{t('guideLoading')}</p>}
          {!state.loading && state.error && <p className="skm-error" role="alert">{t('guideFailed')}: {state.error}</p>}
          {!state.loading && !state.error && <pre className="skm-guideText">{state.text}</pre>}
        </div>
        <footer className="skm-dialogFoot skm-guideFoot">
          <span className="skm-guidePath" title={state.path}>{state.path}</span>
          <button className="skm-btn" type="button" onClick={onClose}>{t('close')}</button>
        </footer>
      </div>
    </div>
  ), document.body)
}
