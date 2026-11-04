export function SkillList({ skills, selectedId, onSelect, t }) {
  if (!skills.length) return <p className="skm-listEmpty">{t('noMatch')}</p>
  return (
    <ul className="skm-list">
      {skills.map(skill => {
        const active = skill.id === selectedId
        const bad = skill.status === 'missing' || skill.status === 'invalid'
        const commandReady = skill.menuEnabled && skill.commandStatus === 'active'
        const commandBroken = skill.menuEnabled && (skill.commandStatus === 'error' || skill.commandStatus === 'unavailable')
        return (
          <li key={skill.id}>
            <button
              className={`skm-listItem${active ? ' is-active' : ''}`}
              type="button"
              onClick={() => onSelect(skill.id)}
            >
              <span className="skm-listTop">
                <span className="skm-listName" title={skill.name}>{skill.name}</span>
                <span
                  className={`skm-dot ${bad ? 'is-bad' : 'is-ok'}`}
                  title={bad ? (skill.status === 'missing' ? t('statusMissing') : t('statusInvalid')) : t('statusOk')}
                />
              </span>
              <span className="skm-listDesc">{skill.description || skill.path}</span>
              <span className="skm-listMeta">
                <span className={`skm-pill ${skill.menuEnabled ? (commandBroken ? 'is-warn' : commandReady ? 'is-on' : 'is-off') : 'is-off'}`}>
                  {skill.menuEnabled ? `/${skill.command}` : t('listMenuOff')}
                </span>
                {bad && (
                  <span className="skm-pill is-bad">
                    {skill.status === 'missing' ? t('listMissing') : t('listInvalid')}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
