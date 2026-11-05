import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { AuditReport } from './AuditReport.jsx'
import { GuideDialog } from './GuideDialog.jsx'
import { BookIcon, FolderIcon, PlusIcon, XIcon } from './icons.jsx'

export function AddSkillDialog({ api, t, pickDirectory, onClose, onAdded }) {
  const [path, setPath] = useState('')
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && !busy && !guideOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, guideOpen, onClose])

  async function browse() {
    setBusy('browse')
    setError('')
    try {
      const picked = await pickDirectory()
      if (picked) {
        setPath(picked)
        setReport(null)
      }
    } finally {
      setBusy('')
    }
  }

  async function validate() {
    const value = path.trim()
    if (!value || busy) return
    setBusy('validate')
    setError('')
    try {
      const result = await api.call('skill/audit-path', { path: value })
      setReport(result.report)
      if (result.report?.ok) setPath(result.path)
    } catch (err) {
      setReport(null)
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function add() {
    const value = path.trim()
    if (!value || busy || !report?.ok) return
    setBusy('add')
    setError('')
    try {
      const skill = await api.call('skill/add', { path: value })
      onAdded(skill)
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  function onPathChange(event) {
    setPath(event.target.value)
    setReport(null)
    setError('')
  }

  function onKeyDown(event) {
    if (event.key !== 'Enter' || busy) return
    event.preventDefault()
    if (report?.ok) add()
    else validate()
  }

  return createPortal((
    <div className="skm-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <div className="skm-dialog skm-addDialog" role="dialog" aria-modal="true" aria-label={t('addTitle')}>
        <header className="skm-dialogHead">
          <span className="skm-dialogIcon"><PlusIcon size={18} /></span>
          <h2>{t('addTitle')}</h2>
          <button className="skm-iconBtn" type="button" onClick={onClose} disabled={Boolean(busy)} aria-label={t('close')}>
            <XIcon />
          </button>
        </header>

        <div className="skm-dialogBody">
          <p className="skm-hint">{t('addHint')}</p>

          <label className="skm-fieldLabel" htmlFor="skm-add-path">{t('pathLabel')}</label>
          <div className="skm-pathRow">
            <input
              id="skm-add-path"
              ref={inputRef}
              className="skm-input"
              value={path}
              placeholder={t('pathPlaceholder')}
              spellCheck={false}
              onChange={onPathChange}
              onKeyDown={onKeyDown}
            />
            <button className="skm-btn" type="button" onClick={browse} disabled={Boolean(busy)}>
              <FolderIcon size={15} />{t('browse')}
            </button>
          </div>

          {report && <AuditReport report={report} t={t} />}
          {error && <p className="skm-error" role="alert">{error}</p>}
          <div className="skm-guideOpenRow">
            <BookIcon size={15} />
            <button className="skm-linkBtn" type="button" onClick={() => setGuideOpen(true)}>{t('guideOpen')}</button>
            <span className="skm-hint is-small">{t('guideHint')}</span>
          </div>
          <p className="skm-hint is-small">{t('menuTip')}</p>
        </div>

        <footer className="skm-dialogFoot">
          <button className="skm-btn" type="button" onClick={onClose} disabled={Boolean(busy)}>{t('cancel')}</button>
          <button className="skm-btn" type="button" onClick={validate} disabled={!path.trim() || Boolean(busy)}>
            {busy === 'validate' ? t('validating') : t('validate')}
          </button>
          <button className="skm-btn is-primary" type="button" onClick={add} disabled={!report?.ok || Boolean(busy)}>
            {busy === 'add' ? t('adding') : t('addConfirm')}
          </button>
        </footer>
      </div>
      {guideOpen && <GuideDialog api={api} t={t} onClose={() => setGuideOpen(false)} />}
    </div>
  ), document.body)
}
