import { formatBytes } from '../lib/format.js'
import { AlertIcon, ShieldIcon } from './icons.jsx'

export function AuditReport({ report, t, compact = false }) {
  if (!report) return null
  const engine = report.engine === 'python'
    ? t('auditEnginePython', { version: report.python ?? '' })
    : t('auditEngineJs')
  const scaffolding = report.scaffolding?.length ? report.scaffolding.join('、') : t('none')
  return (
    <section className={`skm-audit ${report.ok ? 'is-ok' : 'is-bad'}${compact ? ' is-compact' : ''}`}>
      <header className="skm-auditHead">
        {report.ok ? <ShieldIcon size={16} /> : <AlertIcon size={16} />}
        <strong>{report.ok ? t('auditOk') : t('auditFail')}</strong>
        <span className="skm-engine">{engine}</span>
      </header>
      <dl className="skm-auditMeta">
        {report.name && <div><dt>name</dt><dd>{report.name}</dd></div>}
        <div><dt>{t('filesLabel')}</dt><dd>{t('auditFiles', { count: report.files?.count ?? 0, size: formatBytes(report.files?.bytes ?? 0) })}</dd></div>
        <div><dt>scaffold</dt><dd>{report.scaffolding?.length ? t('auditScaffold', { dirs: scaffolding }) : t('auditScaffoldNone')}</dd></div>
      </dl>
      {report.errors?.length > 0 && (
        <div className="skm-auditBlock">
          <h4>{t('auditErrors')}</h4>
          <ul>{report.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
        </div>
      )}
      {report.warnings?.length > 0 && (
        <div className="skm-auditBlock is-warn">
          <h4>{t('auditWarnings')}</h4>
          <ul>{report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        </div>
      )}
      {report.ok && !report.warnings?.length && <p className="skm-auditClean">{t('auditNoIssues')}</p>}
    </section>
  )
}
