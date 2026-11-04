import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

test('package.json declares the DSH bundle, client, icon and agent exports', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.type, 'module')
  assert.match(pkg.main, /lib\/index\.js$/u)
  for (const key of ['.', './agent', './client', './cordis.patch.yml']) assert.ok(pkg.exports?.[key], `exports.${key}`)
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.ok(Array.isArray(pkg.dsh?.client?.inject))
  assert.match(pkg.icon, /icon\.svg$/u)
  assert.ok(pkg.files.some(file => file.startsWith('python/')))
  assert.ok(pkg.peerDependencies['@deepseek-ai/schemastery'])
})

test('cordis patch mounts the host row, preset and read-only agent tools', async () => {
  const yml = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
  assert.match(yml, /id: dsh-skill-manage/u)
  assert.match(yml, /@deepseek-ai\/dsh-agent-preset/u)
  assert.match(yml, /dsh-skill-manage\/agent/u)
  assert.match(yml, /write:\s*false/u)
  assert.match(yml, /edit:\s*false/u)
})

test('the Python validator ships with the package', async () => {
  const script = await readFile(join(root, 'python', 'skill_audit.py'), 'utf8')
  assert.match(script, /def audit\(/u)
  assert.match(script, /json\.dumps/u)
})
