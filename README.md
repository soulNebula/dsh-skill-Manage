# Skill 管理 · dsh-skill-manage

给 DeepSeek Harness（DSH）用的技能管理器：把一个技能文件夹登记进来，DSH 立刻多一个可用技能，并在输入框的 `/` 菜单里多一条命令；从列表移除时，命令同步消失。

左侧栏会多一行入口，位置在「开窍 · AI 私人老师」和「更多」之间。默认显示名是 **Skill 管理**；本机用 `pnpm run build:local` 编译时显示为 **小鱼的技能**。

> 本项目的定位是「引用，不搬家」：技能文件始终留在你原来的文件夹里，插件只保存绝对路径并把它注册进 DSH。不会复制、不会偷偷改文件。

---

## 功能

- **添加 / 移除技能**：选择一个含 `SKILL.md` 的文件夹即可登记；移除默认只移除登记，另有「连同磁盘文件夹一起删除」按钮（二次确认）。
- **导入校验**：优先调用 Python 校验器 `python/skill_audit.py`，没有 Python 时自动退回内置 JavaScript 校验，两种引擎返回同一份报告。
- **自动进 `/` 菜单**：每个技能按 `SKILL.md` 里的 `name` 注册一条斜杠命令；命令名可改，可随时从菜单里关掉。删除技能时命令注册器同步释放。
- **查看与编辑**：文件树 + 文本编辑器，可编辑 `SKILL.md`、`references/`、`scripts/`、`templates/` 里的文本文件；保存 `SKILL.md` 后技能信息自动刷新。
- **实时生效**：DSH 有 `skills/change` 与 `commands/change` 事件，登记/移除不需要重启；只有首次安装 Host 插件需要完全退出重开 DSH。
- **只读 Agent 工具**：附带一个「Skill 管理」会话预设，模型可用 `skm_skills` / `skm_read` 查看技能内容，但不能改。

## 安装

```bash
# 1. 安装依赖并构建
cd ~/.dsh/plugins/dsh-skill-manage
pnpm install
pnpm run build          # 公开版：侧栏显示 Skill 管理
# 或 pnpm run build:local   # 本机版：侧栏显示 小鱼的技能

# 2. 装进 desktop profile（二选一）
dsh plugin --profile desktop add "link:C:/Users/<you>/.dsh/plugins/dsh-skill-manage"
# 或在 DSH 的插件页用「安装本地包 / 绝对路径」选择本项目目录

# 3. 完全退出 DSH 再打开（Host 插件不热加载）
```

也可以直接让 DSH 的 `plugin_manager` 安装这个绝对路径的 bundle：

```text
plugin_manager(action: install_bundle, target: "C:/Users/<you>/.dsh/plugins/dsh-skill-manage")
```

安装后：

1. 左侧栏出现入口；
2. 点「添加 Skill」，选择 `C:\Users\<you>\Desktop\dsh-plugin-product-framework` 这类文件夹；
3. 输入框输入 `/`，应能看到以技能名命名的命令；
4. 在列表里移除技能，命令也应同时消失。

## 配置

插件配置写在 profile 的 `cordis.patch.yml`（按行 id 覆盖，不是重复插入）：

```yaml
- id: dsh-skill-manage
  name: 'dsh-skill-manage'
  config:
    dataDir: dsh-skill-manage
    pythonPath: 'C:\Python314\python.exe'
```

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `dataDir` | `dsh-skill-manage` | 数据目录；相对路径基于 `$DSH_HOME`，也可写绝对路径 |
| `pythonPath` | 空 | 指定 Python 解释器；留空则依次尝试 `DSH_SKILL_MANAGE_PYTHON`、`PYTHON`、`python`、`python3`、`py -3` |

## 配置文件

插件自己的状态只有一个文件：

```text
%USERPROFILE%\.dsh\dsh-skill-manage\config.json
```

```json
{
  "version": 1,
  "updatedAt": 1790000000000,
  "skills": [
    {
      "id": "skm_xxxxxxxxxxxx",
      "name": "dsh-plugin-product-framework",
      "description": "四层框架……",
      "path": "C:\\Users\\you\\Desktop\\dsh-plugin-product-framework",
      "command": "dsh-plugin-product-framework",
      "menuEnabled": true,
      "addedAt": 1790000000000
    }
  ]
}
```

- `path` 是**绝对路径**，也是唯一的事实来源；技能内容不复制进数据目录。
- 文件损坏时会保留为 `config.broken-<时间戳>.json`，插件按空列表启动，避免整个插件起不来。
- 手改这个文件也可以，重启 DSH 后生效；坏条目会被逐条丢弃，不会影响其余技能。
- 仓库里的 `config.example.json` 是同一格式的样例，方便手写或排查。

## 导入规范

导入的必须是一个**文件夹**，核心要求：

```text
my-skill/
  SKILL.md              # 必须；YAML frontmatter 需要 name + description
  references/           # 可选脚手架：参考资料
  scripts/              # 可选脚手架：脚本
  templates/            # 可选脚手架：模板
```

完整规则见 [docs/SKILL-SPEC.md](docs/SKILL-SPEC.md)。最简单的合法例子：

```markdown
---
name: my-skill
description: 一句话说明这个技能做什么、什么时候用。
---

# My skill

正文：步骤、约束、示例。
```

`name` 必须是小写 kebab-case（`a-z`、`0-9`、`-`），它同时决定默认的斜杠命令名。

## 架构（四层）

```text
src/
  core/    纯领域逻辑：frontmatter 解析、配置规范化、路径/文本判定（无 Node、无 DOM）
  host/    store（原子写）、audit（Python + JS 兜底）、files（路径围栏）、features/skills（技能与命令生命周期）、rpc
  agent.js 只读工具薄壳：skm_skills / skm_read
  ui/      React 全页：列表、导入对话框、文件树、编辑器、审计报告
  index.js Host 入口：RPC + skills/commands 服务接线
  client.jsx 浏览器入口：sidebar.panellist + main
```

关键契约：

- 依赖方向单向：`core ← host`、`core ← ui`、`host → agent`（经 runtime 桥）。
- id 即路径：配置里的技能 id 统一 `skm_` 前缀。
- 写盘原子化：临时文件 + rename，Windows 的 `EPERM/EBUSY/EACCES` 重试。
- 导入/校验都是短操作，直接 await；不引入无意义的 job 轮询。
- 错误只外发用户文案：只有 `AppError` 的 code/message 会到浏览器。
- 不可信内容设防：文件路径不能穿出技能根目录，符号链接不跟随，只开文本文件，单文件上限 1 MB。
- 删除保护：拒绝盘符根目录、用户主目录、`~/.dsh`、`~/.dsh/skills`、桌面，以及任何包含这些目录的父目录。

## 斜杠命令怎么工作

添加技能时 Host 调用：

```js
commands.register({
  name: skill.name,
  description: `加载技能「${skill.name}」`,
  handler: invocation => {
    invocation.agent.followup(createUserMessage({
      content: [{ type: 'text', text: activationText(skill, invocation.rawInput) }],
      source: { kind: 'user' },
    }))
    return { kind: 'success', text: `已加载「${skill.name}」技能` }
  },
})
```

注入文本会让模型加载这个技能，并给出 `SKILL.md` 的绝对路径兜底。移除技能或关掉「加入 / 菜单」时，注册器返回的 disposer 被调用，菜单项立即消失。

技能本身通过 `ctx.skills.register(...)` 注册到 DSH 的运行时层，所以外部文件夹不需要复制进 `~/.dsh/skills` 也能被 `skill` 工具找到。

## 开发

```bash
pnpm install
pnpm test          # node:test：core / rpc / 文件围栏 / 包契约
pnpm run build     # tsdown：lib/index.js、lib/agent.js、lib/client.js
pnpm run build:local
```

安装到测试 profile（不要直接动日常 profile）：

```bash
dsh plugin --profile web add "link:<repo>"
dsh --profile web
```

### 关于框架结构审计

用 `/plugin-framework` 自带的 `scripts/audit.mjs` 检查本项目时，会看到 `src/host/jobs.js`、`llm.js`、`generate.js` 和 client 的 job 轮询被标成 missing。这是**模板特有的检查项**：模板演示「模型生成 + 长任务」，而本插件没有模型生成，导入/校验都是本地文件操作（通常远低于 2 秒），直接 await 比引入 job 轮询更简单、更可靠。四层结构、RPC 信封、只读边界、slots 注册、无 `eval` / 无模板 token 残留等契约均通过。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-skill-manage
```

然后完全退出重开 DSH。技能文件夹不受影响；若要清掉插件状态，再删除 `%USERPROFILE%\.dsh\dsh-skill-manage\`。

## License

MIT
