// Pure skill-domain rules: no Node, no DOM, no I/O.
//
// A "managed skill" is one absolute folder on disk. The folder must contain a
// SKILL.md whose YAML frontmatter carries `name` and `description`; the folder
// may also carry scaffolding (references/, scripts/, templates/, ...). These
// helpers are the single place that decides whether an imported folder is a
// valid skill and which text files the editor may open.

export const SKILL_FILE = 'SKILL.md'
export const CONFIG_VERSION = 1

export const LIMITS = Object.freeze({
  name: 64,
  description: 4096,
  command: 64,
  path: 1024,
  fileBytes: 1024 * 1024,
  agentBytes: 400 * 1024,
  treeEntries: 2000,
  treeDepth: 8,
  configSkills: 200,
})

// DSH skill names and slash-command names share this kebab-case shape.
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u
const ABSOLUTE_WINDOWS = /^(?:[A-Za-z]:[\\/]|\\\\)/u

export const SCAFFOLD_DIRS = Object.freeze(['references', 'scripts', 'templates'])

export const SKIP_DIRS = Object.freeze([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '__pycache__',
  '.venv',
  'venv',
  '.pnpm-store',
])

const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx',
  '.txt', '.text', '.rst',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.mts', '.cts',
  '.json', '.json5', '.jsonc',
  '.yml', '.yaml',
  '.toml', '.ini', '.cfg', '.conf', '.properties',
  '.py', '.pyi',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.bat', '.cmd',
  '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg',
  '.csv', '.tsv', '.sql', '.graphql', '.gql',
  '.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.java', '.go', '.rs', '.rb', '.php', '.lua', '.r',
  '.vue', '.svelte',
  '.env', '.example', '.sample', '.dist',
])

const TEXT_BASENAMES = new Set([
  '.gitignore', '.gitattributes', '.editorconfig', '.npmrc', '.nvmrc',
  '.prettierrc', '.eslintrc', '.env', '.env.example', 'license', 'licence',
  'makefile', 'dockerfile', 'readme', 'changelog', 'notice', 'authors',
])

const TEXT_DOTFILES = new Set(['.gitignore', '.gitattributes', '.editorconfig', '.npmrc', '.nvmrc', '.env.example'])

export function cleanText(value, max = LIMITS.description) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, ' ')
    .trim()
    .slice(0, max)
}

export function isSkillName(value) {
  return typeof value === 'string' && value.length <= LIMITS.name && NAME_PATTERN.test(value)
}

export function isCommandName(value) {
  return typeof value === 'string' && value.length <= LIMITS.command && NAME_PATTERN.test(value)
}

export function assertSkillName(value, label = 'skill name') {
  const text = String(value ?? '').trim()
  if (!isSkillName(text)) throw new TypeError(`${label} must be kebab-case (a-z, 0-9, hyphen), at most ${LIMITS.name} chars`)
  return text
}

export function commandFromSkillName(name) {
  return assertSkillName(name)
}

export function isAbsoluteFolder(value) {
  const text = String(value ?? '').trim()
  return text.length > 0 && (ABSOLUTE_WINDOWS.test(text) || text.startsWith('/'))
}

/**
 * Normalize a path relative to a skill root. Rejects absolute paths, drive
 * letters and `..` segments so a browser cannot address anything outside the
 * selected skill folder.
 */
export function normalizeRelativePath(value) {
  const raw = String(value ?? '').replace(/\\/gu, '/').trim()
  if (!raw || raw.length > LIMITS.path) throw new TypeError('invalid file path')
  if (raw.startsWith('/') || /^[A-Za-z]:/u.test(raw) || raw.includes('\u0000')) throw new TypeError('invalid file path')
  const segments = raw.split('/').filter(segment => segment !== '' && segment !== '.')
  if (!segments.length || segments.includes('..')) throw new TypeError('invalid file path')
  return segments.join('/')
}

export function isSafeRelativePath(value) {
  try {
    normalizeRelativePath(value)
    return true
  } catch {
    return false
  }
}

export function isSkippedDir(name) {
  return SKIP_DIRS.includes(String(name ?? '').toLowerCase())
}

/** Whether a relative path is worth offering to the text editor. */
export function isTextPath(relPath) {
  const base = String(relPath ?? '').split('/').pop() ?? ''
  const lower = base.toLowerCase()
  if (!lower) return false
  if (TEXT_DOTFILES.has(lower)) return true
  if (lower.startsWith('.')) {
    const dot = lower.lastIndexOf('.')
    return dot > 0 && TEXT_EXTENSIONS.has(lower.slice(dot))
  }
  const dot = lower.lastIndexOf('.')
  if (dot <= 0) return TEXT_BASENAMES.has(lower)
  return TEXT_EXTENSIONS.has(lower.slice(dot))
}

function unquote(value) {
  const text = String(value ?? '').trim()
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/gu, "'")
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return text.slice(1, -1).replace(/\\n/gu, '\n').replace(/\\t/gu, '\t').replace(/\\"/gu, '"')
  }
  return text
}

function foldBlock(lines, style) {
  if (style.startsWith('|')) return lines.join('\n')
  const parts = []
  let buffer = []
  const flush = () => {
    if (buffer.length) {
      parts.push(buffer.join(' '))
      buffer = []
    }
  }
  for (const line of lines) {
    if (line.trim() === '') {
      flush()
      parts.push('\n')
    } else {
      buffer.push(line.trim())
    }
  }
  flush()
  return parts.join('').replace(/\n{3,}/gu, '\n\n').replace(/\n$/u, '')
}

/**
 * Parse the leading YAML frontmatter block. Only the scalar subset SKILL.md
 * needs is supported: `key: value`, quoted values, `>` / `|` block scalars.
 * Nested mappings are ignored rather than guessed at.
 */
export function parseFrontmatter(text) {
  const source = String(text ?? '').replace(/^\uFEFF/u, '')
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u.exec(source)
  if (!match) return { data: {}, body: source, hasFrontmatter: false }
  const lines = match[1].split(/\r?\n/u)
  const data = {}
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || line.trim().startsWith('#')) continue
    const entry = /^([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]*(.*))?$/u.exec(line)
    if (!entry) continue
    const key = entry[1]
    const value = (entry[2] ?? '').trim()
    if (/^[>|][+-]?$/u.test(value)) {
      const style = value
      const block = []
      let cursor = index + 1
      for (; cursor < lines.length; cursor += 1) {
        const next = lines[cursor]
        if (next.trim() === '') {
          block.push('')
          continue
        }
        if (!/^[ \t]/u.test(next)) break
        block.push(next.replace(/^[ \t]+/u, ''))
      }
      if (!style.endsWith('+')) while (block.length && block[block.length - 1] === '') block.pop()
      data[key] = foldBlock(block, style)
      index = cursor - 1
    } else if (value === '') {
      let cursor = index + 1
      while (cursor < lines.length && (/^[ \t]/u.test(lines[cursor]) || lines[cursor].trim() === '')) cursor += 1
      data[key] = ''
      index = cursor - 1
    } else {
      data[key] = unquote(value)
    }
  }
  return { data, body: source.slice(match[0].length), hasFrontmatter: true }
}

export function normalizeSkillDocument(text) {
  const { data, body, hasFrontmatter } = parseFrontmatter(text)
  if (!hasFrontmatter) throw new TypeError('SKILL.md must start with a YAML frontmatter block (--- ... ---)')
  const name = assertSkillName(data.name, 'frontmatter.name')
  const description = cleanText(data.description, LIMITS.description)
  if (!description) throw new TypeError('frontmatter.description is required')
  const whenToUse = cleanText(data.whenToUse ?? data['when-to-use'], LIMITS.description)
  return { name, description, whenToUse, body, frontmatter: data, raw: String(text ?? '') }
}

export function serializeConfig(config) {
  const entries = Array.isArray(config?.skills) ? config.skills : []
  return {
    version: CONFIG_VERSION,
    updatedAt: Number.isFinite(config?.updatedAt) ? config.updatedAt : Date.now(),
    skills: entries,
  }
}

export function brief(text, max = 180) {
  const value = String(text ?? '').replace(/\s+/gu, ' ').trim()
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}
