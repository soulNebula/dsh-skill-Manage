// Versioned shape of the plugin's own config file (`config.json`).
// The file is the source of truth: every managed skill is stored as its
// absolute folder path plus the slash-command metadata derived from it, and
// the plugin's own preferences live in `settings`.
import { ID_PATTERN } from './ids.js'
import {
  CONFIG_VERSION,
  LIMITS,
  cleanText,
  isAbsoluteFolder,
  isCommandName,
  isSkillName,
} from './model.js'

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u

export const FONT_SIZE = Object.freeze({ min: 12, max: 20, default: 14 })
export const SETTINGS_DEFAULTS = Object.freeze({ fontSize: FONT_SIZE.default })

export function normalizeSettings(raw) {
  const value = Number(raw?.fontSize)
  const fontSize = Number.isInteger(value) && value >= FONT_SIZE.min && value <= FONT_SIZE.max
    ? value
    : FONT_SIZE.default
  return { fontSize }
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '').trim()
  if (!ID_PATTERN.test(id) || !id.startsWith('skm_')) return null
  const name = String(raw.name ?? '').trim()
  if (!isSkillName(name)) return null
  const path = String(raw.path ?? '').trim()
  if (!path || path.length > LIMITS.path || CONTROL.test(path) || !isAbsoluteFolder(path)) return null
  const command = String(raw.command ?? '').trim() || name
  if (!isCommandName(command)) return null
  const description = cleanText(raw.description, LIMITS.description)
  return {
    id,
    name,
    description,
    path,
    command,
    menuEnabled: raw.menuEnabled !== false,
    addedAt: Number.isFinite(raw.addedAt) && raw.addedAt > 0 ? Number(raw.addedAt) : 0,
  }
}

/**
 * Normalize an on-disk config file. A bad entry is dropped item by item; the
 * file as a whole never throws, because a single hand-edited mistake must not
 * take the plugin down. Duplicate ids/names/paths keep the first entry.
 */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const seenIds = new Set()
  const seenNames = new Set()
  const seenPaths = new Set()
  const skills = []
  for (const item of Array.isArray(source.skills) ? source.skills : []) {
    const entry = normalizeEntry(item)
    if (!entry) continue
    if (seenIds.has(entry.id) || seenNames.has(entry.name) || seenPaths.has(entry.path.toLowerCase())) continue
    seenIds.add(entry.id)
    seenNames.add(entry.name)
    seenPaths.add(entry.path.toLowerCase())
    skills.push(entry)
    if (skills.length >= LIMITS.configSkills) break
  }
  return {
    version: CONFIG_VERSION,
    updatedAt: Number.isFinite(source.updatedAt) ? Number(source.updatedAt) : 0,
    settings: normalizeSettings(source.settings),
    skills,
  }
}

export function emptyConfig() {
  return {
    version: CONFIG_VERSION,
    updatedAt: 0,
    settings: { ...SETTINGS_DEFAULTS },
    skills: [],
  }
}

export function configEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    path: entry.path,
    command: entry.command,
    menuEnabled: entry.menuEnabled !== false,
    addedAt: entry.addedAt,
  }
}
