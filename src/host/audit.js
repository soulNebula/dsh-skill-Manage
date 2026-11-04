// Skill validation with two engines:
//   1. python/skill_audit.py (the project's Python half, run when a Python
//      interpreter is available),
//   2. a built-in JavaScript validator that always works.
// Both return the same report shape, so the UI and the import gate never care
// which one ran.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  LIMITS,
  SCAFFOLD_DIRS,
  SKILL_FILE,
  cleanText,
  normalizeSkillDocument,
} from '../core/model.js'
import { listSkillTree } from './files.js'

const HERE = dirname(fileURLToPath(import.meta.url))

function resolveAuditScript() {
  const candidates = [
    join(HERE, '..', 'python', 'skill_audit.py'),
    join(HERE, '..', '..', 'python', 'skill_audit.py'),
  ]
  return candidates.find(candidate => existsSync(candidate)) ?? null
}

const pythonCache = new Map()

function run(command, args, options) {
  return new Promise(resolvePromise => {
    execFile(command, args, options, (error, stdout, stderr) => {
      resolvePromise({ error, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') })
    })
  })
}

/** Find a usable Python once per configured path; returns null when absent. */
export async function detectPython({ configured = '', env = process.env } = {}) {
  const key = String(configured ?? '').trim()
  if (pythonCache.has(key)) return pythonCache.get(key)
  const candidates = []
  if (key) candidates.push({ command: key, prefix: [] })
  for (const name of ['DSH_SKILL_MANAGE_PYTHON', 'PYTHON', 'PYTHON3']) {
    const value = String(env?.[name] ?? '').trim()
    if (value) candidates.push({ command: value, prefix: [] })
  }
  candidates.push({ command: 'python', prefix: [] }, { command: 'python3', prefix: [] })
  if (process.platform === 'win32') candidates.push({ command: 'py', prefix: ['-3'] })
  let found = null
  for (const candidate of candidates) {
    const { error, stdout } = await run(
      candidate.command,
      [...candidate.prefix, '-c', 'import sys;print(".".join(str(p) for p in sys.version_info[:3]))'],
      { timeout: 5000, windowsHide: true, encoding: 'utf8' },
    )
    if (error) continue
    const version = stdout.trim().split(/\r?\n/u).pop() ?? ''
    if (!/^\d+\.\d+\.\d+/u.test(version)) continue
    found = { ...candidate, version }
    break
  }
  pythonCache.set(key, found)
  return found
}

function reportShape(raw, engine) {
  if (!raw || typeof raw !== 'object') throw new TypeError('audit engine returned an invalid report')
  return {
    ok: raw.ok === true,
    engine,
    name: cleanText(raw.name, LIMITS.name),
    description: cleanText(raw.description, LIMITS.description),
    whenToUse: cleanText(raw.whenToUse, LIMITS.description),
    folder: String(raw.folder ?? ''),
    root: String(raw.root ?? ''),
    errors: (Array.isArray(raw.errors) ? raw.errors : []).map(value => cleanText(value, 2000)).filter(Boolean),
    warnings: (Array.isArray(raw.warnings) ? raw.warnings : []).map(value => cleanText(value, 2000)).filter(Boolean),
    files: {
      count: Math.max(0, Number(raw.files?.count) || 0),
      bytes: Math.max(0, Number(raw.files?.bytes) || 0),
      text: Math.max(0, Number(raw.files?.text) || 0),
    },
    scaffolding: (Array.isArray(raw.scaffolding) ? raw.scaffolding : []).map(value => cleanText(value, 40)).filter(Boolean),
    python: typeof raw.python === 'string' ? raw.python : null,
  }
}

async function pythonAudit(folder, python) {
  const script = resolveAuditScript()
  if (!script) throw new Error('python/skill_audit.py is missing')
  const { error, stdout, stderr } = await run(
    python.command,
    [...python.prefix, script, folder],
    { timeout: 15000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, encoding: 'utf8' },
  )
  const text = stdout.trim()
  if (!text) throw new Error(error ? `${error.code ?? 'python failed'}: ${stderr.trim().slice(0, 300)}` : 'python printed nothing')
  const parsed = JSON.parse(text)
  return reportShape(parsed, 'python')
}

export async function javascriptAudit(folder, extraWarnings = []) {
  const result = {
    ok: false,
    engine: 'js',
    name: '',
    description: '',
    whenToUse: '',
    folder: '',
    root: String(folder),
    errors: [],
    warnings: [...extraWarnings],
    files: { count: 0, bytes: 0, text: 0 },
    scaffolding: [],
    python: null,
  }
  const info = await stat(folder).catch(() => null)
  if (!info) {
    result.errors.push(`The folder does not exist: ${folder}`)
    return result
  }
  if (!info.isDirectory()) {
    result.errors.push(`Not a folder: ${folder}`)
    return result
  }
  const skillFile = join(folder, SKILL_FILE)
  const fileInfo = await stat(skillFile).catch(() => null)
  if (!fileInfo?.isFile()) {
    result.errors.push(`The folder has no ${SKILL_FILE}.`)
    return result
  }
  if (fileInfo.size > LIMITS.fileBytes) {
    result.errors.push(`${SKILL_FILE} is larger than ${Math.round(LIMITS.fileBytes / 1024)} KB.`)
    return result
  }
  let text
  try {
    text = await readFile(skillFile, 'utf8')
  } catch (error) {
    result.errors.push(`Cannot read ${SKILL_FILE}: ${error?.code ?? 'error'}`)
    return result
  }
  try {
    const doc = normalizeSkillDocument(text)
    result.name = doc.name
    result.description = doc.description
    result.whenToUse = doc.whenToUse
  } catch (error) {
    result.errors.push(error?.message ?? 'Invalid SKILL.md')
    return result
  }
  const folderName = String(folder).split(/[\\/]+/u).filter(Boolean).pop() ?? ''
  result.folder = folderName
  if (folderName && folderName.toLowerCase() !== result.name.toLowerCase()) {
    result.warnings.push(
      `The folder is named "${folderName}" but the skill is "${result.name}". Renaming the folder to match makes imports easier to recognize.`,
    )
  }
  try {
    const tree = await listSkillTree({ id: 'skm_audit', path: folder })
    result.files.count = tree.entries.filter(entry => entry.type === 'file').length
    result.files.bytes = tree.entries.reduce((sum, entry) => sum + (entry.size ?? 0), 0)
    result.files.text = tree.entries.filter(entry => entry.type === 'file' && entry.text).length
    result.warnings.push(...tree.warnings)
    if (tree.truncated) result.warnings.push(`The folder is larger than ${LIMITS.treeEntries} entries; only the first part was inspected.`)
  } catch (error) {
    result.warnings.push(`Could not list the whole folder: ${error?.message ?? 'error'}`)
  }
  for (const name of SCAFFOLD_DIRS) {
    const dirInfo = await stat(join(folder, name)).catch(() => null)
    if (dirInfo?.isDirectory()) result.scaffolding.push(name)
  }
  if (!result.scaffolding.length) {
    result.warnings.push(
      'No references/, scripts/ or templates/ folder. That is allowed, but a scaffold folder makes the skill reusable.',
    )
  }
  result.ok = result.errors.length === 0
  return result
}

/**
 * Validate a skill folder with Python when available, otherwise with the
 * built-in validator. Never throws for a merely invalid folder; the report
 * carries the reasons.
 */
export async function auditSkill(folder, { pythonPath = '', logger } = {}) {
  let python = null
  try {
    python = await detectPython({ configured: pythonPath })
  } catch (error) {
    logger?.warn?.('skill-manage: could not probe Python: %s', error?.message)
  }
  if (python) {
    try {
      return await pythonAudit(folder, python)
    } catch (error) {
      logger?.warn?.('skill-manage: Python audit failed, using JavaScript: %s', error?.message)
      return javascriptAudit(folder, [
        `Python audit failed (${python.command} ${python.version}); the built-in JavaScript validator was used instead.`,
      ])
    }
  }
  return javascriptAudit(folder)
}

export function clearPythonCache() {
  pythonCache.clear()
}
