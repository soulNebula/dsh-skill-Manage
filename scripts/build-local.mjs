#!/usr/bin/env node
// Local build: compiles the sidebar label as "小鱼的技能" without changing the
// public default. `pnpm run build` always produces "Skill 管理".
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const label = process.env.DSH_SKILL_MANAGE_LABEL || '小鱼的技能'
const bin = join('node_modules', '.bin', process.platform === 'win32' ? 'tsdown.cmd' : 'tsdown')

if (!existsSync(bin)) {
  console.error('build:local: node_modules is missing. Run `pnpm install` first.')
  process.exit(1)
}

const child = spawn(bin, ['--config', 'tsdown.config.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, DSH_SKILL_MANAGE_LABEL: label },
  shell: process.platform === 'win32',
})

child.on('error', error => {
  console.error(`build:local: ${error.message}`)
  process.exit(1)
})
child.on('exit', code => process.exit(code ?? 1))
