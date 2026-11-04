import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createApi } from './api.js'
import { AddSkillDialog } from './components/AddSkillDialog.jsx'
import { SkillDetail } from './components/SkillDetail.jsx'
import { SkillList } from './components/SkillList.jsx'
import { BookIcon, PlusIcon, SearchIcon } from './components/icons.jsx'

export function App({ rpc, t, pickDirectory, label }) {
  const api = useMemo(() => createApi(rpc), [rpc])
  const [skills, setSkills] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const reload = useCallback(async () => {
    try {
      const list = await api.call('skill/list')
      setSkills(list)
      return list
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (loading) return
    if (!skills.length) {
      if (selectedId) setSelectedId('')
      return
    }
    if (!skills.some(skill => skill.id === selectedId)) setSelectedId(skills[0].id)
  }, [skills, selectedId, loading])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const notify = useCallback(message => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }, [])

  const handleChanged = useCallback(updated => {
    setSkills(previous => previous.map(skill => (skill.id === updated.id ? updated : skill)))
  }, [])

  const handleRemoved = useCallback(async ({ deleted, name }) => {
    await reload()
    notify(deleted ? t('skillDeleted', { name }) : t('skillRemoved', { name }))
  }, [reload, notify, t])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return skills
    return skills.filter(skill =>
      skill.name.toLowerCase().includes(needle)
      || skill.path.toLowerCase().includes(needle)
      || skill.description.toLowerCase().includes(needle),
    )
  }, [skills, query])

  const selected = skills.find(skill => skill.id === selectedId) ?? null

  return (
    <div className="skm-app">
      <header className="skm-header">
        <div className="skm-headerMain">
          <span className="skm-logo"><BookIcon size={22} /></span>
          <div className="skm-headerText">
            <h1 className="skm-title">{label || t('title')}</h1>
            <p className="skm-subtitle">{t('subtitle')}</p>
          </div>
        </div>
        <div className="skm-headerActions">
          <span className="skm-count">{t('count', { count: skills.length })}</span>
          <button className="skm-btn is-primary" type="button" onClick={() => setAddOpen(true)}>
            <PlusIcon size={16} />{t('add')}
          </button>
        </div>
      </header>

      <div className="skm-body">
        <aside className="skm-sidebar">
          <div className="skm-search">
            <SearchIcon size={15} />
            <input
              className="skm-searchInput"
              value={query}
              placeholder={t('searchPlaceholder')}
              onChange={event => setQuery(event.target.value)}
            />
            {query && (
              <button className="skm-iconBtn is-tiny" type="button" onClick={() => setQuery('')} aria-label={t('close')}>
                ×
              </button>
            )}
          </div>
          {loading
            ? <p className="skm-muted skm-sidebarPad">…</p>
            : <SkillList skills={filtered} selectedId={selectedId} onSelect={setSelectedId} t={t} />}
        </aside>

        <main className="skm-main">
          {error && (
            <div className="skm-banner is-bad" role="alert">
              <span>{error}</span>
              <button className="skm-linkBtn" type="button" onClick={() => { setError(''); reload() }}>{t('retry')}</button>
            </div>
          )}
          {loading ? (
            <div className="skm-loading" role="status">…</div>
          ) : selected ? (
            <SkillDetail
              key={selected.id}
              skill={selected}
              api={api}
              t={t}
              onChanged={handleChanged}
              onRemoved={handleRemoved}
              notify={notify}
            />
          ) : (
            <div className="skm-empty">
              <span className="skm-emptyIcon"><BookIcon size={44} /></span>
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyHint')}</p>
              <button className="skm-btn is-primary" type="button" onClick={() => setAddOpen(true)}>
                <PlusIcon size={16} />{t('emptyAdd')}
              </button>
            </div>
          )}
        </main>
      </div>

      {addOpen && (
        <AddSkillDialog
          api={api}
          t={t}
          pickDirectory={pickDirectory}
          onClose={() => setAddOpen(false)}
          onAdded={async skill => {
            setAddOpen(false)
            await reload()
            setSelectedId(skill.id)
            notify(t('skillAdded', { name: skill.name }))
          }}
        />
      )}

      {toast && <div className="skm-toast" role="status">{toast}</div>}
    </div>
  )
}
