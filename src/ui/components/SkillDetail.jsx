import { useCallback, useEffect, useRef, useState } from 'react'

import { formatBytes } from '../lib/format.js'
import { AuditReport } from './AuditReport.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { FileTree } from './FileTree.jsx'
import {
  CopyIcon,
  FileIcon,
  RefreshIcon,
  SaveIcon,
  ShieldIcon,
  TrashIcon,
} from './icons.jsx'

function statusLabel(skill, t) {
  if (skill.status === 'missing') return t('statusMissing')
  if (skill.status === 'invalid') return t('statusInvalid')
  if (skill.status === 'ok') return t('statusOk')
  return t('statusUnknown')
}

export function SkillDetail({ skill, api, t, onChanged, onRemoved, notify }) {
  const [tree, setTree] = useState(null)
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [fileText, setFileText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [fileInfo, setFileInfo] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState('')
  const [auditReport, setAuditReport] = useState(null)
  const [auditNotice, setAuditNotice] = useState(null)
  const [auditError, setAuditError] = useState('')
  const [commandDraft, setCommandDraft] = useState(skill.command)
  const [confirm, setConfirm] = useState(null)
  const [pendingFile, setPendingFile] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)

  const dirty = fileText !== savedText

  const openFile = useCallback(async path => {
    setFileLoading(true)
    setFileError('')
    try {
      const file = await api.call('files/read', { id: skill.id, path })
      setSelectedPath(file.path)
      setFileText(file.text)
      setSavedText(file.text)
      setFileInfo(file)
    } catch (err) {
      setSelectedPath(path)
      setFileText('')
      setSavedText('')
      setFileInfo(null)
      setFileError(err.message)
    } finally {
      setFileLoading(false)
    }
  }, [api, skill.id])

  const openBinary = useCallback(path => {
    setSelectedPath(path)
    setFileText('')
    setSavedText('')
    setFileInfo(null)
    setFileError(t('binaryFile'))
  }, [t])

  const loadTree = useCallback(async () => {
    setTreeLoading(true)
    setTreeError('')
    try {
      const result = await api.call('files/tree', { id: skill.id })
      setTree(result)
      const files = result.entries.filter(entry => entry.type === 'file')
      const first = files.find(entry => entry.path === 'SKILL.md') ?? files.find(entry => entry.text)
      if (first) await openFile(first.path)
      else {
        setSelectedPath('')
        setFileText('')
        setSavedText('')
        setFileInfo(null)
      }
    } catch (err) {
      setTreeError(err.message)
    } finally {
      setTreeLoading(false)
    }
  }, [api, skill.id, openFile])

  useEffect(() => {
    loadTree().catch(() => undefined)
  }, [loadTree])

  useEffect(() => {
    let cancelled = false
    api.call('skill/audit', { id: skill.id })
      .then(result => { if (!cancelled) setAuditReport(result.report) })
      .catch(err => { if (!cancelled) setAuditError(err.message) })
    return () => { cancelled = true }
  }, [api, skill.id])

  useEffect(() => {
    setCommandDraft(skill.command)
  }, [skill.command])

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  function requestOpen(node) {
    if (node.text === false) {
      if (dirty) {
        setPendingFile(node.path)
        setConfirm('discard')
        return
      }
      openBinary(node.path)
      return
    }
    if (dirty) {
      setPendingFile(node.path)
      setConfirm('discard')
      return
    }
    openFile(node.path).catch(() => undefined)
  }

  async function confirmDiscard() {
    const path = pendingFile
    setConfirm(null)
    setPendingFile('')
    await openFile(path)
  }

  async function saveFile() {
    if (!selectedPath || !dirty || saving || fileError) return
    setSaving(true)
    setError('')
    try {
      const result = await api.call('files/write', {
        id: skill.id,
        path: selectedPath,
        content: fileText,
      })
      setSavedText(fileText)
      setFileInfo(result.file)
      if (selectedPath === 'SKILL.md') {
        onChanged(result.skill)
        notify(t('savedAndReloaded'))
      } else {
        notify(t('saved'))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function onEditorKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      saveFile().catch(() => undefined)
    }
  }

  async function toggleMenu(event) {
    const enabled = event.target.checked
    setBusy('menu')
    setError('')
    try {
      onChanged(await api.call('skill/update', { id: skill.id, menuEnabled: enabled }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function saveCommand() {
    if (busy) return
    setBusy('command')
    setError('')
    try {
      const updated = await api.call('skill/update', { id: skill.id, command: commandDraft.trim() })
      setCommandDraft(updated.command)
      onChanged(updated)
      notify(t('commandSaved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function reloadSkill() {
    if (busy || dirty) return
    setBusy('reload')
    setError('')
    try {
      const updated = await api.call('skill/reload', { id: skill.id })
      onChanged(updated)
      setCommandDraft(updated.command)
      await loadTree()
      notify(t('reloaded'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function runAudit() {
    if (busy) return
    setBusy('audit')
    setAuditError('')
    try {
      const result = await api.call('skill/audit', { id: skill.id })
      setAuditReport(result.report)
      setAuditNotice(result.report)
      onChanged(result.skill)
    } catch (err) {
      setAuditError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function confirmRemove() {
    const deleting = confirm === 'delete'
    setBusy('remove')
    setError('')
    try {
      await api.call('skill/remove', { id: skill.id, deleteFiles: deleting })
      setConfirm(null)
      onRemoved({ deleted: deleting, name: skill.name })
    } catch (err) {
      setError(err.message)
      setConfirm(null)
      setBusy('')
    }
  }

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(skill.path)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const fileCount = tree?.entries?.filter(entry => entry.type === 'file').length ?? 0
  const statusClass = skill.status === 'ok' ? 'is-ok' : skill.status === 'missing' || skill.status === 'invalid' ? 'is-bad' : 'is-warn'

  return (
    <div className="skm-detail">
      <header className="skm-detailHead">
        <div className="skm-titleRow">
          <h2 className="skm-detailTitle" title={skill.name}>{skill.name}</h2>
          <span className={`skm-status ${statusClass}`}>{statusLabel(skill, t)}</span>
          {skill.menuEnabled && <span className="skm-status is-command">/{skill.command}</span>}
        </div>
        <p className="skm-detailDesc">{skill.description || t('none')}</p>

        <div className="skm-pathLine">
          <span className="skm-pathLabel">{t('pathLabel')}</span>
          <code className="skm-pathText" title={skill.path}>{skill.path}</code>
          <button className="skm-iconBtn" type="button" onClick={copyPath} title={t('copyPath')} aria-label={t('copyPath')}>
            <CopyIcon size={15} />
          </button>
          {copied && <span className="skm-copied">{t('copied')}</span>}
        </div>

        <div className="skm-actions">
          <label className="skm-switch">
            <input
              type="checkbox"
              checked={skill.menuEnabled}
              disabled={busy === 'menu'}
              onChange={toggleMenu}
            />
            <span className="skm-switchTrack"><span className="skm-switchThumb" /></span>
            <span className="skm-switchText">{t('menuToggle')}</span>
          </label>

          <div className="skm-cmdEdit">
            <span className="skm-slash">/</span>
            <input
              className="skm-input is-small"
              value={commandDraft}
              placeholder={t('commandPlaceholder')}
              spellCheck={false}
              disabled={!skill.menuEnabled || busy === 'command'}
              onChange={event => setCommandDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') saveCommand() }}
              aria-label={t('commandLabel')}
            />
            <button
              className="skm-btn is-small"
              type="button"
              onClick={saveCommand}
              disabled={!skill.menuEnabled || busy === 'command' || commandDraft.trim() === skill.command}
            >
              {t('saveCommand')}
            </button>
          </div>

          <button className="skm-btn" type="button" onClick={reloadSkill} disabled={Boolean(busy) || dirty}>
            <RefreshIcon size={15} />{busy === 'reload' ? t('reloading') : t('reload')}
          </button>
          <button className="skm-btn" type="button" onClick={runAudit} disabled={Boolean(busy)}>
            <ShieldIcon size={15} />{busy === 'audit' ? t('auditing') : t('audit')}
          </button>

          <span className="skm-spacer" />

          <button className="skm-btn is-ghostDanger" type="button" onClick={() => setConfirm('remove')} disabled={Boolean(busy)}>
            <TrashIcon size={15} />{t('remove')}
          </button>
          <button
            className="skm-btn is-danger"
            type="button"
            onClick={() => setConfirm('delete')}
            disabled={Boolean(busy) || skill.status === 'missing'}
            title={t('deleteFiles')}
          >
            <TrashIcon size={15} />{t('deleteFiles')}
          </button>
        </div>

        {skill.status === 'missing' || skill.status === 'invalid' ? (
          <p className="skm-error">{skill.error || statusLabel(skill, t)}</p>
        ) : null}
        {skill.commandStatus === 'error' && (
          <p className="skm-inlineWarn">{t('commandError')}: {skill.commandError}</p>
        )}
        {skill.commandStatus === 'unavailable' && (
          <p className="skm-inlineWarn">{t('commandUnavailable')}</p>
        )}
        {error && <p className="skm-error" role="alert">{error}</p>}
      </header>

      {auditError && <p className="skm-error">{auditError}</p>}
      {auditReport && <AuditReport report={auditReport} t={t} />}

      <section className="skm-files">
        <aside className="skm-treePanel">
          <header className="skm-panelHead">
            <span>{t('filesLabel')}</span>
            <span className="skm-panelMeta">{t('filesCount', { count: fileCount })}</span>
          </header>
          <div className="skm-treeScroll">
            {treeLoading && <p className="skm-muted">{t('reloading')}</p>}
            {treeError && <p className="skm-error">{treeError}</p>}
            {!treeLoading && !treeError && tree && (
              <>
                <FileTree flat={tree.entries} selectedPath={selectedPath} onOpen={requestOpen} t={t} />
                {tree.truncated && <p className="skm-muted">{t('treeTruncated')}</p>}
              </>
            )}
          </div>
        </aside>

        <div className="skm-editorPanel">
          <header className="skm-panelHead">
            <span className="skm-fileTitle"><FileIcon size={14} />{selectedPath || t('noFile')}</span>
            {dirty && <span className="skm-dirty">{t('dirty')}</span>}
            {fileInfo && <span className="skm-panelMeta">{formatBytes(fileInfo.size)}</span>}
            <span className="skm-spacer" />
            <button
              className="skm-btn is-small is-primary"
              type="button"
              onClick={saveFile}
              disabled={!dirty || saving || Boolean(fileError) || !selectedPath}
            >
              <SaveIcon size={14} />{saving ? t('saving') : t('save')}
            </button>
          </header>
          <div className="skm-editorBody">
            {fileLoading && <p className="skm-muted">{t('reloading')}</p>}
            {!fileLoading && fileError && <p className="skm-error skm-editorError">{fileError}</p>}
            {!fileLoading && !fileError && !selectedPath && <p className="skm-muted">{t('noFile')}</p>}
            {!fileLoading && !fileError && selectedPath && (
              <textarea
                className="skm-editor"
                value={fileText}
                spellCheck={false}
                onChange={event => setFileText(event.target.value)}
                onKeyDown={onEditorKeyDown}
                aria-label={selectedPath}
              />
            )}
          </div>
        </div>
      </section>

      {auditNotice && (
        <ConfirmDialog
          title={auditNotice.ok ? t('auditOk') : t('auditFail')}
          confirmLabel={t('close')}
          cancelLabel={null}
          danger={!auditNotice.ok}
          icon={auditNotice.ok ? <ShieldIcon size={18} /> : undefined}
          onConfirm={() => setAuditNotice(null)}
          onCancel={() => setAuditNotice(null)}
        >
          <p className="skm-auditDialogMeta">
            {auditNotice.engine === 'python'
              ? t('auditEnginePython', { version: auditNotice.python ?? '' })
              : t('auditEngineJs')}
            {' · '}
            {t('auditFiles', {
              count: auditNotice.files?.count ?? 0,
              size: formatBytes(auditNotice.files?.bytes ?? 0),
            })}
          </p>
          {auditNotice.ok
            ? <p>{t('auditNoIssues')}</p>
            : (
              <ul className="skm-auditDialogList">
                {(auditNotice.errors ?? []).map((message, index) => <li key={index}>{message}</li>)}
              </ul>
            )}
          {auditNotice.warnings?.length > 0 && (
            <p className="skm-inlineWarn">{t('auditWarnings')}: {auditNotice.warnings.length}</p>
          )}
          <p className="skm-hint">{t('auditDialogHint')}</p>
        </ConfirmDialog>
      )}

      {confirm === 'remove' && (
        <ConfirmDialog
          title={t('removeTitle')}
          confirmLabel={t('confirmRemove')}
          cancelLabel={t('cancel')}
          busy={busy === 'remove'}
          onConfirm={confirmRemove}
          onCancel={() => setConfirm(null)}
        >
          <p>{t('removeBody')}</p>
        </ConfirmDialog>
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title={t('deleteTitle')}
          confirmLabel={t('confirmDelete')}
          cancelLabel={t('cancel')}
          danger
          busy={busy === 'remove'}
          onConfirm={confirmRemove}
          onCancel={() => setConfirm(null)}
        >
          <p>{t('deleteBody')}</p>
          <code className="skm-pathText is-block">{skill.path}</code>
        </ConfirmDialog>
      )}
      {confirm === 'discard' && (
        <ConfirmDialog
          title={t('discardTitle')}
          confirmLabel={t('discardConfirm')}
          cancelLabel={t('cancel')}
          onConfirm={confirmDiscard}
          onCancel={() => { setConfirm(null); setPendingFile('') }}
        >
          <p>{t('discardBody')}</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
