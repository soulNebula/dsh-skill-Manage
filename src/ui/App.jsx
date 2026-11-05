import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createApi } from './api.js'
import { AddSkillDialog } from './components/AddSkillDialog.jsx'
import { SettingsDialog } from './components/SettingsDialog.jsx'
import { SkillDetail } from './components/SkillDetail.jsx'
import { SkillList } from './components/SkillList.jsx'
import { BookIcon, GearIcon, PlusIcon, SearchIcon } from './components/icons.jsx'

export function App({ rpc, t, pickDirectory, label, getTheme, setTheme }) {
  const api = useMemo(() => createApi(rpc), [rpc])
  const [skills, setSkills] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [info, setInfo] = useState(null)
  const [settings, setSettings] = useState({ fontSize: 14 })
  const [themePreference, setThemePreference] = useState(() => (
    typeof getTheme === 'function' ? getTheme() : 'system'
  ))
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

  const loadInfo = useCallback(async () => {
    try {
      const next = await api.call('app/info')
      setInfo(next)
      if (next?.settings) setSettings(next.settings)
      return next
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [api])

  useEffect(() => {
    reload()
    loadInfo()
  }, [reload, loadInfo])

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
    await loadInfo()
    notify(deleted ? t('skillDeleted', { name }) : t('skillRemoved', { name }))
  }, [reload, loadInfo, notify, t])

  const handleSkillsReloaded = useCallback(list => {
    setSkills(list)
    setInfo(previous => (previous ? { ...previous, count: list.length } : previous))
  }, [])

  const handleSettingsChanged = useCallback(next => {
    setSettings(next)
    setInfo(previous => (previous ? { ...previous, settings: next } : previous))
  }, [])

  function openSettings() {
    if (typeof getTheme === 'function') setThemePreference(getTheme())
    setSettingsOpen(true)
  }

  function changeTheme(id) {
    setThemePreference(id)
    if (typeof setTheme === 'function') setTheme(id)
  }

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
  const zoom = Math.max(0.75, Math.min(1.6, (settings?.fontSize ?? 14) / 14))

  return (
    <div className="skm-app">
      <div
        className="skm-scale"
        style={{
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
        }}
      >
      <header className="skm-header">
        <div className="skm-headerMain">
          <span className="skm-logo"><BookIcon size={22} /></span>
          <div className="skm-headerText">
            <h1 className="skm-title">{label || t('title')}</h1>
            <p className="skm-subtitle">{t('subtitle')}</p>
          </div>
        </div>
        <div className="skm-headerActions">
          <button
            className="skm-iconBtn skm-settingsBtn"
            type="button"
            onClick={openSettings}
            title={t('settings')}
            aria-label={t('settings')}
          >
            <GearIcon size={18} />
          </button>
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
              <button className="skm-linkBtn" type="button" onClick={() => { setError(''); reload(); loadInfo() }}>{t('retry')}</button>
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
            await loadInfo()
            setSelectedId(skill.id)
            notify(t('skillAdded', { name: skill.name }))
          }}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          api={api}
          t={t}
          info={info}
          settings={settings}
          themePreference={themePreference}
          onThemeChange={changeTheme}
          onSettingsChange={handleSettingsChanged}
          onSkillsReloaded={handleSkillsReloaded}
          onClose={() => setSettingsOpen(false)}
          notify={notify}
        />
      )}

      {toast && <div className="skm-toast" role="status">{toast}</div>}
    </div>
  )
}
