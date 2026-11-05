// Use-case layer: the managed-skill catalog <-> DSH's `skills` and `commands`
// services. Long-lived registrations (skill provider entries and slash
// commands) are owned here so every mutation updates both the config file and
// the live DSH catalog.
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { FONT_SIZE, SETTINGS_DEFAULTS, configEntry, normalizeConfig, normalizeSettings } from '../../core/config.js'
import { assertId, newId } from '../../core/ids.js'
import {
  CONFIG_VERSION,
  LIMITS,
  SKILL_FILE,
  cleanText,
  isCommandName,
  normalizeRelativePath,
  normalizeSkillDocument,
} from '../../core/model.js'
import { auditSkill, detectPython } from '../audit.js'
import { AppError } from '../errors.js'
import {
  assertDeletableSkillDir,
  listSkillTree,
  readSkillFile,
  resolveSkillDir,
  writeSkillFile,
} from '../files.js'

export const ID_PREFIX = 'skm'

function commandText(entry, goal) {
  const lines = [
    `The user invoked the /${entry.command} slash command.`,
    `Load the \`${entry.name}\` skill (call the skill tool). If the skill catalog does not list it, read \`${join(entry.path, SKILL_FILE)}\` and its \`references/\` folder directly.`,
    'Then follow that skill and do the real work it describes. Do not just describe the skill.',
  ]
  if (goal) lines.push(`Task: ${goal}`)
  return lines.join('\n')
}

function userFacing(error, fallback) {
  if (error instanceof AppError) return error.message
  if (error?.code === 'ENOENT') return `The file or folder no longer exists: ${error.path ?? ''}`.trim()
  return fallback
}

export function createSkillsService({ store, logger, pythonPath = '', version = '0.0.0', createUserMessage }) {
  let entries = []
  let skillsService
  let commandsService
  let mutation = Promise.resolve()
  let settingsValue = { ...SETTINGS_DEFAULTS }
  const docs = new Map()
  const status = new Map()
  const skillDisposers = new Map()
  const commandDisposers = new Map()

  const serial = task => {
    const run = mutation.then(task, task)
    mutation = run.catch(() => undefined)
    return run
  }

  const statusOf = id => status.get(id) ?? {}

  function requireEntry(value) {
    const id = assertId(String(value ?? ''), ID_PREFIX)
    const entry = entries.find(item => item.id === id)
    if (!entry) throw new AppError('not-found', '这个技能已经不在列表里了。')
    return entry
  }

  function disposeSkill(id) {
    const disposer = skillDisposers.get(id)
    skillDisposers.delete(id)
    if (typeof disposer === 'function') {
      try { disposer() } catch (error) { logger?.warn?.('skill-manage: skill disposer failed: %s', error?.message) }
    }
  }

  function disposeCommand(id) {
    const disposer = commandDisposers.get(id)
    commandDisposers.delete(id)
    if (typeof disposer === 'function') {
      try { disposer() } catch (error) { logger?.warn?.('skill-manage: command disposer failed: %s', error?.message) }
    }
  }

  function registerSkill(entry) {
    disposeSkill(entry.id)
    if (!skillsService) {
      status.set(entry.id, { ...statusOf(entry.id), skillsError: 'unavailable' })
      return false
    }
    const cached = docs.get(entry.id)
    if (!cached?.doc) {
      status.set(entry.id, { ...statusOf(entry.id), skillsError: cached?.error ?? 'not-loaded' })
      return false
    }
    try {
      const disposer = skillsService.register({
        name: entry.name,
        description: entry.description,
        content: cached.doc.raw,
        path: join(entry.path, SKILL_FILE),
        resourceBase: { kind: 'directory', path: entry.path },
      })
      if (typeof disposer === 'function') skillDisposers.set(entry.id, disposer)
      status.set(entry.id, { ...statusOf(entry.id), skillsError: '' })
      return true
    } catch (error) {
      logger?.warn?.('skill-manage: cannot register %s: %s', entry.name, error?.message)
      status.set(entry.id, { ...statusOf(entry.id), skillsError: error?.message ?? 'register-failed' })
      return false
    }
  }

  function commandHandler(entry) {
    return invocation => {
      try {
        if (typeof createUserMessage !== 'function') throw new Error('createUserMessage is unavailable')
        const goal = String(invocation?.rawInput ?? '').trim().slice(0, 4000)
        invocation.agent.followup(createUserMessage({
          content: [{ type: 'text', text: commandText(entry, goal) }],
          source: { kind: 'user' },
        }))
        return {
          kind: 'success',
          text: goal
            ? `已加载「${entry.name}」技能，开始处理：${goal}`
            : `已加载「${entry.name}」技能。说说要用它做什么。`,
        }
      } catch (error) {
        logger?.warn?.('skill-manage: command /%s failed: %s', entry.command, error?.message)
        return { kind: 'error', text: '技能加载失败，请重试；如果一直失败，请重新打开 DSH。' }
      }
    }
  }

  function registerCommand(entry) {
    disposeCommand(entry.id)
    if (!entry.menuEnabled) return false
    if (!commandsService) {
      status.set(entry.id, { ...statusOf(entry.id), commandError: 'unavailable' })
      return false
    }
    try {
      const disposer = commandsService.register({
        name: entry.command,
        description: `加载技能「${entry.name}」`,
        input: { hint: '[可选：直接说明要用这个技能做什么]' },
        handler: commandHandler(entry),
      })
      if (typeof disposer === 'function') commandDisposers.set(entry.id, disposer)
      status.set(entry.id, { ...statusOf(entry.id), commandError: '' })
      return true
    } catch (error) {
      logger?.warn?.('skill-manage: cannot register /%s: %s', entry.command, error?.message)
      status.set(entry.id, { ...statusOf(entry.id), commandError: error?.message ?? 'command-failed' })
      return false
    }
  }

  async function readDocument(entry) {
    const text = await readFile(join(entry.path, SKILL_FILE), 'utf8')
    return normalizeSkillDocument(text)
  }

  async function refreshEntry(entry, { persist = false } = {}) {
    disposeSkill(entry.id)
    disposeCommand(entry.id)
    const previousName = entry.name
    let doc
    try {
      doc = await readDocument(entry)
    } catch (error) {
      logger?.warn?.('skill-manage: cannot read %s: %s', entry.name, error?.message)
      const missing = error?.code === 'ENOENT'
      docs.delete(entry.id)
      status.set(entry.id, {
        status: missing ? 'missing' : 'invalid',
        error: userFacing(error, 'SKILL.md 无法读取或格式不正确。'),
      })
      return false
    }
    if (doc.name !== entry.name) {
      if (entries.some(item => item.id !== entry.id && item.name === doc.name)) {
        docs.delete(entry.id)
        status.set(entry.id, {
          status: 'invalid',
          error: `SKILL.md 里的 name「${doc.name}」和列表里另一个技能重名。`,
        })
        return false
      }
      entry.name = doc.name
      if (entry.command === previousName) entry.command = doc.name
    }
    entry.description = doc.description
    docs.set(entry.id, { doc })
    status.set(entry.id, { status: 'ok', error: '' })
    registerSkill(entry)
    registerCommand(entry)
    if (persist) await save()
    return true
  }

  function view(entry) {
    const state = statusOf(entry.id)
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      path: entry.path,
      command: entry.command,
      menuEnabled: entry.menuEnabled !== false,
      addedAt: entry.addedAt,
      status: state.status ?? 'unknown',
      error: state.error ?? '',
      commandStatus: entry.menuEnabled === false
        ? 'off'
        : commandDisposers.has(entry.id)
          ? 'active'
          : state.commandError === 'unavailable'
            ? 'unavailable'
            : state.commandError
              ? 'error'
              : 'inactive',
      commandError: state.commandError && state.commandError !== 'unavailable' ? state.commandError : '',
    }
  }

  async function save() {
    await store.saveConfig({
      version: CONFIG_VERSION,
      updatedAt: Date.now(),
      settings: settingsValue,
      skills: entries.map(configEntry),
    })
  }

  async function load() {
    const raw = await store.loadConfig().catch(error => {
      logger?.warn?.('skill-manage: config read failed: %s', error?.message)
      return null
    })
    const config = normalizeConfig(raw)
    settingsValue = config.settings
    entries = config.skills
    for (const entry of entries) await refreshEntry(entry, { persist: false })
    // Drop entries that the normalizer rejected? Keep the file as it is until
    // the next real mutation; silently rewriting on boot loses hand edits.
    return entries.length
  }

  function setSkills(service) {
    if (service === skillsService) return
    skillsService = service
    if (!service) {
      for (const id of [...skillDisposers.keys()]) disposeSkill(id)
      return
    }
    for (const entry of entries) if (docs.get(entry.id)?.doc) registerSkill(entry)
  }

  function setCommands(service) {
    if (service === commandsService) return
    commandsService = service
    if (!service) {
      for (const id of [...commandDisposers.keys()]) disposeCommand(id)
      return
    }
    for (const entry of entries) if (entry.menuEnabled && docs.get(entry.id)?.doc) registerCommand(entry)
  }

  function normalizeCommand(value, fallback) {
    const text = String(value ?? '').trim()
    if (!text) return fallback
    if (!isCommandName(text)) {
      throw new AppError('bad-command', '命令名只能用小写字母、数字和连字符，例如 my-skill。')
    }
    return text
  }

  async function add(payload = {}) {
    return serial(async () => {
      const dir = await resolveSkillDir(payload.path)
      if (entries.some(entry => entry.path.toLowerCase() === dir.toLowerCase())) {
        throw new AppError('duplicate-path', '这个文件夹已经在技能列表里了。')
      }
      const report = await auditSkill(dir, { pythonPath, logger })
      if (!report.ok) {
        throw new AppError('invalid-skill', report.errors[0] ?? '这个文件夹不是有效的 DSH 技能。')
      }
      if (entries.some(entry => entry.name === report.name)) {
        throw new AppError('duplicate-name', `已经有一个名为「${report.name}」的技能了。`)
      }
      const fallbackCommand = report.name
      const command = normalizeCommand(payload.command, fallbackCommand)
      if (entries.some(entry => entry.command === command)) {
        throw new AppError('duplicate-command', `/${command} 已经被列表里的另一个技能占用了。`)
      }
      const entry = {
        id: newId(ID_PREFIX),
        name: report.name,
        description: cleanText(report.description, LIMITS.description),
        path: dir,
        command,
        menuEnabled: payload.menuEnabled !== false,
        addedAt: Date.now(),
      }
      entries.push(entry)
      status.set(entry.id, { status: 'ok', error: '' })
      await refreshEntry(entry, { persist: false })
      await save()
      return view(entry)
    })
  }

  async function remove(payload = {}) {
    return serial(async () => {
      const entry = requireEntry(payload.id)
      const deleteFiles = payload.deleteFiles === true
      if (deleteFiles) {
        await assertDeletableSkillDir(entry.path)
        try {
          await rm(entry.path, { recursive: true, force: false })
        } catch (error) {
          throw new AppError('delete-failed', `删除文件夹失败：${error?.message ?? 'unknown error'}`)
        }
      }
      disposeSkill(entry.id)
      disposeCommand(entry.id)
      entries = entries.filter(item => item.id !== entry.id)
      docs.delete(entry.id)
      status.delete(entry.id)
      await save()
      return { removed: true, deletedFiles: deleteFiles }
    })
  }

  async function update(payload = {}) {
    return serial(async () => {
      const entry = requireEntry(payload.id)
      let changed = false
      if (payload.menuEnabled !== undefined) {
        const next = payload.menuEnabled !== false
        if (next !== entry.menuEnabled) {
          entry.menuEnabled = next
          changed = true
        }
      }
      if (payload.command !== undefined) {
        const next = normalizeCommand(payload.command, entry.name)
        if (entries.some(item => item.id !== entry.id && item.command === next)) {
          throw new AppError('duplicate-command', `/${next} 已经被列表里的另一个技能占用了。`)
        }
        if (next !== entry.command) {
          entry.command = next
          changed = true
        }
      }
      if (changed) {
        disposeCommand(entry.id)
        if (entry.menuEnabled) registerCommand(entry)
        await save()
      }
      return view(entry)
    })
  }

  async function reload(payload = {}) {
    return serial(async () => {
      const entry = requireEntry(payload.id)
      await refreshEntry(entry, { persist: true })
      return view(entry)
    })
  }

  async function audit(payload = {}) {
    const entry = requireEntry(payload.id)
    const report = await auditSkill(entry.path, { pythonPath, logger })
    return { report, skill: view(entry) }
  }

  async function tree(payload = {}) {
    const entry = requireEntry(payload.id)
    return listSkillTree(entry)
  }

  async function readFileById(payload = {}) {
    const entry = requireEntry(payload.id)
    return readSkillFile(entry, payload.path)
  }

  async function writeFileById(payload = {}) {
    return serial(async () => {
      const entry = requireEntry(payload.id)
      const rel = normalizeRelativePath(payload.path)
      const file = await writeSkillFile(entry, rel, payload.content)
      if (rel === SKILL_FILE) {
        await refreshEntry(entry, { persist: true })
        return { file, skill: view(entry) }
      }
      return { file, skill: view(entry) }
    })
  }

  function list() {
    return entries.map(view)
  }

  async function info() {
    const python = await detectPython({ configured: pythonPath }).catch(() => null)
    return {
      version,
      dataDir: store.paths.root,
      configPath: store.paths.config,
      count: entries.length,
      settings: { ...settingsValue },
      python: {
        available: Boolean(python),
        command: python?.command ?? null,
        version: python?.version ?? null,
      },
    }
  }

  function getSettings() {
    return { ...settingsValue }
  }

  async function saveSettings(payload = {}) {
    return serial(async () => {
      const value = Number(payload.fontSize)
      if (!Number.isInteger(value) || value < FONT_SIZE.min || value > FONT_SIZE.max) {
        throw new AppError('bad-font-size', `字号需要在 ${FONT_SIZE.min}–${FONT_SIZE.max} 之间。`)
      }
      settingsValue = normalizeSettings({ ...settingsValue, fontSize: value })
      await save()
      return { ...settingsValue }
    })
  }

  async function readConfigText() {
    try {
      return await readFile(store.paths.config, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      return `${JSON.stringify({ version: CONFIG_VERSION, updatedAt: Date.now(), settings: settingsValue, skills: entries.map(configEntry) }, null, 1)}
`
    }
  }

  async function readConfig() {
    return { path: store.paths.config, text: await readConfigText() }
  }

  async function writeConfig(payload = {}) {
    return serial(async () => {
      const text = String(payload.text ?? '')
      if (!text.trim()) throw new AppError('config-empty', '配置文件不能为空。')
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        throw new AppError('config-invalid', `JSON 格式错误：${error?.message ?? 'parse failed'}`)
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new AppError('config-invalid', '配置文件必须是一个 JSON 对象。')
      }
      const next = normalizeConfig(parsed)
      const requested = Array.isArray(parsed.skills) ? parsed.skills.length : 0
      if (next.skills.length !== requested) {
        throw new AppError('config-invalid', `有 ${requested - next.skills.length} 条技能记录格式不正确，已拒绝保存。请检查 id、name、path、command。`)
      }
      for (const id of [...skillDisposers.keys()]) disposeSkill(id)
      for (const id of [...commandDisposers.keys()]) disposeCommand(id)
      entries = next.skills
      settingsValue = next.settings
      docs.clear()
      status.clear()
      for (const entry of entries) await refreshEntry(entry, { persist: false })
      await save()
      return { path: store.paths.config, text: await readConfigText(), skills: list(), settings: { ...settingsValue } }
    })
  }

  function agentList() {
    return entries.map(entry => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      path: entry.path,
      command: entry.command,
      menuEnabled: entry.menuEnabled !== false,
      status: statusOf(entry.id).status ?? 'unknown',
    }))
  }

  async function agentRead(payload = {}) {
    const wanted = String(payload.skill ?? '').trim()
    const entry = entries.find(item => item.id === wanted || item.name === wanted)
    if (!entry) throw new AppError('not-found', '找不到这个技能。先用 skm_skills 列出列表。')
    const file = await readSkillFile(entry, payload.path)
    const truncated = file.text.length > LIMITS.agentBytes
    return {
      name: entry.name,
      path: file.path,
      bytes: file.size,
      truncated,
      content: truncated ? file.text.slice(0, LIMITS.agentBytes) : file.text,
      resourceBase: { kind: 'directory', path: entry.path },
    }
  }

  function dispose() {
    for (const id of [...skillDisposers.keys()]) disposeSkill(id)
    for (const id of [...commandDisposers.keys()]) disposeCommand(id)
    entries = []
    docs.clear()
    status.clear()
  }

  return {
    load,
    list,
    add,
    remove,
    update,
    reload,
    audit,
    tree,
    readFile: readFileById,
    writeFile: writeFileById,
    info,
    view,
    getSettings,
    saveSettings,
    readConfig,
    writeConfig,
    setSkills,
    setCommands,
    dispose,
    agentList,
    agentRead,
    configPath: () => store.paths.config,
  }
}
