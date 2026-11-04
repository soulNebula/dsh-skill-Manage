// Filesystem side of one managed skill folder.
// Every read/write is contained to the real (symlink-resolved) skill root, and
// only text files smaller than the editor limit are exposed.
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path'

import {
  LIMITS,
  SKILL_FILE,
  isAbsoluteFolder,
  isSkippedDir,
  isTextPath,
  normalizeRelativePath,
} from '../core/model.js'
import { AppError } from './errors.js'
import { writeFileAtomic } from './store.js'

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u
const textQueues = new Map()

function inside(root, target) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

function assertRelative(value) {
  try {
    return normalizeRelativePath(value)
  } catch {
    throw new AppError('invalid-path', 'That file path is outside the skill folder.')
  }
}

/** Resolve an imported folder to its real absolute path and require SKILL.md. */
export async function resolveSkillDir(input) {
  let text = String(input ?? '').trim()
  if (text.length >= 2 && (text.startsWith('"') && text.endsWith('"') || text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim()
  }
  if (!text) throw new AppError('path-required', 'Choose a skill folder first.')
  if (text.length > LIMITS.path || CONTROL.test(text) || !isAbsoluteFolder(text)) {
    throw new AppError('path-invalid', 'Use an absolute folder path, for example C:\\Users\\you\\skills\\my-skill.')
  }
  const resolved = resolve(text)
  const info = await stat(resolved).catch(() => null)
  if (!info) throw new AppError('path-missing', `The folder does not exist: ${resolved}`)
  if (!info.isDirectory()) throw new AppError('not-directory', 'The selected path is a file, not a folder.')
  const root = await realpath(resolved)
  const skillFile = await stat(join(root, SKILL_FILE)).catch(() => null)
  if (!skillFile?.isFile()) {
    throw new AppError('missing-skill-file', `This folder has no ${SKILL_FILE}. A skill folder must contain ${SKILL_FILE}.`)
  }
  return root
}

export async function listSkillTree(entry) {
  const root = await realpath(entry.path).catch(() => {
    throw new AppError('path-missing', `The skill folder no longer exists: ${entry.path}`)
  })
  const entries = []
  const warnings = []
  let truncated = false

  async function walk(dir, relDir, depth) {
    if (entries.length >= LIMITS.treeEntries) {
      truncated = true
      return
    }
    if (depth > LIMITS.treeDepth) {
      truncated = true
      warnings.push(`Stopped below ${relDir || '.'}: the folder is deeper than ${LIMITS.treeDepth} levels.`)
      return
    }
    let children
    try {
      children = await readdir(dir, { withFileTypes: true })
    } catch (error) {
      warnings.push(`Could not read ${relDir || '.'}: ${error?.code ?? 'error'}`)
      return
    }
    children.sort((left, right) => {
      const dirDelta = Number(right.isDirectory()) - Number(left.isDirectory())
      return dirDelta || left.name.localeCompare(right.name, 'zh')
    })
    for (const child of children) {
      if (entries.length >= LIMITS.treeEntries) {
        truncated = true
        return
      }
      const rel = relDir ? `${relDir}/${child.name}` : child.name
      if (child.isSymbolicLink()) {
        entries.push({ path: rel, type: 'file', size: 0, text: false, symlink: true })
        warnings.push(`Skipped symlink: ${rel}`)
        continue
      }
      if (child.isDirectory()) {
        if (isSkippedDir(child.name)) continue
        entries.push({ path: rel, type: 'dir', size: 0, text: false })
        await walk(join(dir, child.name), rel, depth + 1)
        continue
      }
      if (!child.isFile()) continue
      const info = await stat(join(dir, child.name)).catch(() => null)
      const size = info?.size ?? 0
      entries.push({
        path: rel,
        type: 'file',
        size,
        text: isTextPath(rel) && size <= LIMITS.fileBytes,
        mtimeMs: info?.mtimeMs ?? 0,
      })
    }
  }

  await walk(root, '', 0)
  return { root, entries, truncated, warnings }
}

async function resolveTarget(entry, relPath) {
  const root = await realpath(entry.path).catch(() => {
    throw new AppError('path-missing', `The skill folder no longer exists: ${entry.path}`)
  })
  const rel = assertRelative(relPath)
  const target = resolve(root, ...rel.split('/'))
  if (!inside(root, target)) throw new AppError('outside-skill', 'That file is outside the skill folder.')
  const real = await realpath(target).catch(() => null)
  if (!real) throw new AppError('file-not-found', `File not found: ${rel}`)
  if (!inside(root, real)) throw new AppError('outside-skill', 'That file resolves outside the skill folder.')
  const info = await lstat(real).catch(() => null)
  if (!info) throw new AppError('file-not-found', `File not found: ${rel}`)
  if (info.isSymbolicLink()) throw new AppError('symlink', 'Symlinked files are not editable here.')
  if (!info.isFile()) throw new AppError('not-a-file', 'That path is not a file.')
  return { root, rel, real, info }
}

export async function readSkillFile(entry, relPath) {
  const { rel, real, info } = await resolveTarget(entry, relPath)
  if (!isTextPath(rel)) throw new AppError('not-text', 'This file type cannot be opened in the text editor.')
  if (info.size > LIMITS.fileBytes) {
    throw new AppError('file-too-large', `This file is larger than ${Math.round(LIMITS.fileBytes / 1024)} KB.`)
  }
  const buffer = await readFile(real)
  if (buffer.includes(0)) throw new AppError('binary-file', 'This looks like a binary file.')
  const text = buffer.toString('utf8')
  if (text.includes('\uFFFD') && buffer.length > 0) {
    const replacementRatio = (text.match(/\uFFFD/gu) ?? []).length / Math.max(1, text.length)
    if (replacementRatio > 0.02) throw new AppError('binary-file', 'This file is not valid UTF-8 text.')
  }
  return { path: rel, text, size: buffer.length, mtimeMs: info.mtimeMs ?? 0 }
}

function enqueueText(path, task) {
  const previous = textQueues.get(path) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(task)
  const tail = run.catch(() => undefined)
  textQueues.set(path, tail)
  tail.then(() => { if (textQueues.get(path) === tail) textQueues.delete(path) })
  return run
}

export async function writeSkillFile(entry, relPath, content) {
  const { rel, real } = await resolveTarget(entry, relPath)
  if (!isTextPath(rel)) throw new AppError('not-text', 'This file type cannot be edited here.')
  const text = String(content ?? '')
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > LIMITS.fileBytes) {
    throw new AppError('file-too-large', `Refusing to write more than ${Math.round(LIMITS.fileBytes / 1024)} KB.`)
  }
  await enqueueText(real, () => writeFileAtomic(real, text))
  const info = await stat(real).catch(() => null)
  return { path: rel, size: bytes, mtimeMs: info?.mtimeMs ?? 0 }
}

/**
 * Refuse obviously catastrophic delete targets: drive roots, the user's home,
 * the DSH data directory, the Desktop itself, and any folder that contains one
 * of those.
 */
export async function assertDeletableSkillDir(entryPath) {
  const root = await realpath(entryPath).catch(() => {
    throw new AppError('path-missing', `The skill folder no longer exists: ${entryPath}`)
  })
  const home = await realpath(homedir()).catch(() => homedir())
  const dshHome = await realpath(join(home, '.dsh')).catch(() => join(home, '.dsh'))
  const driveRoot = parse(root).root
  const segments = root.split(/[\\/]+/u).filter(Boolean)
  if (root.toLowerCase() === driveRoot.toLowerCase() || segments.length < 3) {
    throw new AppError('unsafe-delete', 'Refusing to delete a drive root or a top-level folder.')
  }
  const protectedPaths = [
    home,
    join(home, 'Desktop'),
    join(home, 'Documents'),
    dshHome,
    join(dshHome, 'skills'),
    join(dshHome, 'plugins'),
  ].map(value => value.toLowerCase())
  if (protectedPaths.includes(root.toLowerCase())) {
    throw new AppError('unsafe-delete', 'Refusing to delete a protected folder.')
  }
  for (const guard of protectedPaths) {
    if (inside(root.toLowerCase(), guard)) {
      throw new AppError('unsafe-delete', `Refusing to delete a folder that contains ${guard}.`)
    }
  }
  return root
}
