// Browser entry of Skill 管理: a full page behind a sidebar row.
// Register every DSH surface inside ctx.effect so uninstalling releases it.
import { App } from './ui/App.jsx'
import { en, NS, zh } from './ui/i18n.js'
import { STYLE } from './ui/styles.js'

export const inject = ['slots', 'locale', 'connection', 'uiWorkspace']

const PACKAGE = 'dsh-skill-manage'
const PANEL_ID = 'dsh-skill-manage'
// Public builds say "Skill 管理"; `pnpm run build:local` compiles "小鱼的技能".
const PANEL_LABEL = typeof SKM_PANEL_LABEL === 'string' ? SKM_PANEL_LABEL : 'Skill 管理'

function PanelIcon({ size = 18, active = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10.5v18H7a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M4.5 18.5A2.5 2.5 0 0 1 7 16h10.5" />
      <path d="M9 7.5h5.5M9 11h4" />
      <path d="M17.5 3v6l1.6-1.2L20.7 9V3z" />
    </svg>
  )
}

function MainPage({ rpc, t, pickDirectory, label }) {
  return <App rpc={rpc} t={t} pickDirectory={pickDirectory} label={label} />
}

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'skill-manage: copy')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = PACKAGE
    tag.textContent = STYLE
    document.head.append(tag)
    return () => tag.remove()
  }, 'skill-manage: style')

  const t = ctx.locale.bind(NS)
  const rpc = ctx.get('connection').rpc
  const uiWorkspace = ctx.get('uiWorkspace')
  const pickDirectory = async () => {
    if (typeof uiWorkspace?.pickDirectory !== 'function') return null
    try {
      return await uiWorkspace.pickDirectory()
    } catch {
      return null
    }
  }

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: () => ({ rpc, t, pickDirectory, label: PANEL_LABEL }),
  }, MainPage))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 30,
    locale: NS,
    label: () => PANEL_LABEL,
  }, PanelIcon))
}
