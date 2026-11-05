import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { CopyIcon, GearIcon, RefreshIcon, SaveIcon, XIcon } from './icons.jsx'

export function SettingsDialog({
  api,
  t,
  info,
  settings,
  themePreference,
  onThemeChange,
  onSettingsChange,
  onSkillsReloaded,
  onClose,
  notify,
}) {
  const [theme, setTheme] = useState(themePreference)
  const [fontSize, setFontSize] = useState(settings?.fontSize ?? 14)
  const [savingFont, setSavingFont] = useState(false)
  const [fontError, setFontError] = useState('')
  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadConfig = useCallback(async () => {
    setConfigLoading(true)
    setConfigError('')
    try {
      setConfig(await api.call('config/read'))
    } catch (error) {
      setConfigError(error.message)
    } finally {
      setConfigLoading(false)
    }
  }, [api])

  useEffect(() => {
    loadConfig().catch(() => undefined)
    const onKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadConfig, onClose])

  function pickTheme(id) {
    setTheme(id)
    onThemeChange(id)
  }

  async function saveFontSize() {
    setSavingFont(true)
    setFontError('')
    try {
      const next = await api.call('settings/save', { fontSize })
      onSettingsChange(next)
      notify(t('settingsSaved'))
    } catch (error) {
      setFontError(error.message)
    } finally {
      setSavingFont(false)
    }
  }

  async function saveConfig() {
    if (!config?.text || configSaving) return
    setConfigSaving(true)
    setConfigError('')
    try {
      const result = await api.call('config/write', { text: config.text })
      setConfig(result)
      onSkillsReloaded(result.skills)
      if (result.settings) onSettingsChange(result.settings)
      notify(t('configSaved'))
    } catch (error) {
      setConfigError(error.message)
    } finally {
      setConfigSaving(false)
    }
  }

  async function copyConfigPath() {
    const path = config?.path || info?.configPath
    if (!path) return
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const python = info?.python
  const themeOptions = [
    ['system', t('themeSystem')],
    ['light', t('themeLight')],
    ['dark', t('themeDark')],
  ]

  return createPortal((
    <div className="skm-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="skm-dialog skm-settingsDialog" role="dialog" aria-modal="true" aria-label={t('settingsTitle')}>
        <header className="skm-dialogHead">
          <span className="skm-dialogIcon"><GearIcon size={18} /></span>
          <h2>{t('settingsTitle')}</h2>
          <button className="skm-iconBtn" type="button" onClick={onClose} aria-label={t('close')}><XIcon /></button>
        </header>

        <div className="skm-dialogBody skm-settingsBody">
          <section className="skm-settingsSection">
            <h3>{t('themeSection')}</h3>
            <div className="skm-settingsRow">
              <span className="skm-settingsLabel">{t('themeLabel')}</span>
              <div className="skm-segmented" role="group" aria-label={t('themeLabel')}>
                {themeOptions.map(([id, label]) => (
                  <button
                    key={id}
                    className={theme === id ? 'is-active' : ''}
                    type="button"
                    aria-pressed={theme === id}
                    onClick={() => pickTheme(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="skm-hint is-small">{t('themeHint')}</p>
          </section>

          <section className="skm-settingsSection">
            <h3>{t('fontSizeLabel')}</h3>
            <div className="skm-rangeRow">
              <input
                className="skm-range"
                type="range"
                min="12"
                max="20"
                step="1"
                value={fontSize}
                onChange={event => setFontSize(Number(event.target.value))}
                aria-label={t('fontSizeLabel')}
              />
              <span className="skm-rangeValue">{t('fontSizeValue', { size: fontSize })}</span>
              <button className="skm-btn is-small is-primary" type="button" onClick={saveFontSize} disabled={savingFont || fontSize === settings?.fontSize}>
                <SaveIcon size={14} />{savingFont ? t('saving') : t('save')}
              </button>
            </div>
            <p className="skm-hint is-small">{t('fontSizeHint', { min: 12, max: 20 })}</p>
            {fontError && <p className="skm-error">{fontError}</p>}
          </section>

          <section className="skm-settingsSection">
            <h3>{t('pluginSection')}</h3>
            <dl className="skm-infoGrid">
              <dt>{t('versionLabel')}</dt>
              <dd>{info?.version ?? '—'}</dd>
              <dt>{t('dataDirLabel')}</dt>
              <dd title={info?.dataDir}>{info?.dataDir ?? '—'}</dd>
              <dt>{t('configPathLabel')}</dt>
              <dd className="skm-infoPath">
                <span title={info?.configPath}>{info?.configPath ?? '—'}</span>
                <button className="skm-iconBtn is-tiny" type="button" onClick={copyConfigPath} title={t('copyPath')} aria-label={t('copyPath')}>
                  <CopyIcon size={13} />
                </button>
                {copied && <span className="skm-copied">{t('copied')}</span>}
              </dd>
              <dt>{t('pythonLabel')}</dt>
              <dd>
                {python?.available
                  ? t('pythonAvailable', { version: python.version ?? '' })
                  : t('pythonMissingLabel')}
              </dd>
            </dl>
          </section>

          <section className="skm-settingsSection">
            <div className="skm-settingsSectionHead">
              <h3>{t('configSection')}</h3>
              <span className="skm-spacer" />
              <button className="skm-btn is-small" type="button" onClick={loadConfig} disabled={configLoading || configSaving}>
                <RefreshIcon size={14} />{t('configReload')}
              </button>
              <button className="skm-btn is-small is-primary" type="button" onClick={saveConfig} disabled={configLoading || configSaving || !config}>
                <SaveIcon size={14} />{configSaving ? t('saving') : t('configSave')}
              </button>
            </div>
            <p className="skm-hint is-small">{t('configHint')}</p>
            {configLoading && <p className="skm-muted">{t('configLoading')}</p>}
            {configError && <p className="skm-error" role="alert">{configError}</p>}
            {!configLoading && config && (
              <textarea
                className="skm-configEditor"
                value={config.text}
                spellCheck={false}
                onChange={event => setConfig({ ...config, text: event.target.value })}
                aria-label={t('configSection')}
              />
            )}
          </section>
        </div>

        <footer className="skm-dialogFoot">
          <button className="skm-btn" type="button" onClick={onClose}>{t('close')}</button>
        </footer>
      </div>
    </div>
  ), document.body)
}
