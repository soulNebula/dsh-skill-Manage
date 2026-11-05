# DSH Skill 导入规范（v1）

本文规定 **Skill 管理（dsh-skill-manage）** 能导入什么、如何校验、添加后 DSH 里会发生什么。所有规则同时由 `python/skill_audit.py` 和 `src/core/model.js` 实现；两者不一致时以本文件为准并修实现。

参考实现：`C:\Users\Administrator\Desktop\dsh-plugin-product-framework`（一个真实可用的 skill 文件夹：`SKILL.md` + `references/` + `scripts/` + `templates/` + `integrations/`）。

---

## 1. 一句话规则

> 导入单位必须是一个**绝对路径文件夹**；文件夹根目录必须有 `SKILL.md`；`SKILL.md` 的 YAML frontmatter 必须有 `name` 和 `description`；其余目录都是可选脚手架。

不是文件夹、没有 `SKILL.md`、frontmatter 缺字段、`name` 不是 kebab-case —— 一律拒绝导入。

---

## 2. 目录结构

### 2.1 最低要求

```text
my-skill/
  SKILL.md
```

### 2.2 推荐结构

```text
my-skill/
  SKILL.md                  # 必须：元数据 + 技能正文
  references/               # 推荐：按需加载的长文档、对照表、架构说明
    ...
  scripts/                  # 可选：脚手架、校验器、生成器
    ...
  templates/                # 可选：要被复制的项目模板
    ...
  integrations/             # 可选：和其它系统集成的示例（框架 skill 就有）
    ...
  assets/                   # 可选：图片、字体等（不参与文本编辑）
    ...
```

### 2.3 允许但不会展示的目录

以下目录会被文件树跳过（仍然留在磁盘上）：

```text
.git  .hg  .svn  node_modules  __pycache__  .venv  venv  .pnpm-store
```

### 2.4 符号链接

- 文件树里会显示 `link` 标记，但**不跟随**、不可编辑。
- 校验器会给出提醒。
- 不要用符号链接把技能根目录指到别处；导入时传真实文件夹路径。

---

## 3. SKILL.md

### 3.1 文件要求

| 项目 | 要求 |
| --- | --- |
| 文件名 | 必须正好是 `SKILL.md`（区分大小写） |
| 编码 | UTF-8（允许 BOM） |
| 大小 | ≤ 1 MB |
| 开头 | 必须是 YAML frontmatter：第一行 `---`，闭合行 `---` |

### 3.2 frontmatter 字段

```yaml
---
name: my-skill
description: >-
  一句话说明这个技能做什么、什么时候用。
  可以多行，读取时会折叠成一行。
whenToUse: 可选；更具体的使用场景。
---
```

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `name` | 是 | 小写 kebab-case：`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`，≤ 64 字符。决定默认的斜杠命令名 |
| `description` | 是 | 1–4096 字符；写清「做什么 + 什么时候用」；模型靠它决定是否加载 |
| `whenToUse` | 否 | 可写 `when-to-use`；补充触发场景 |

解析器只支持标量字段：`key: value`、单双引号、`>` / `|` 块。嵌套 mapping 会被忽略，不要依赖。

### 3.3 正文

frontmatter 之后是技能的完整说明，建议包含：

1. 这个技能解决什么问题；
2. 执行步骤（编号）；
3. 约束 / 禁止事项；
4. 需要按需读取的 `references/` 文件清单；
5. 一两个最小示例。

正文没有硬性长度限制，但 `SKILL.md` 整体 ≤ 1 MB。把长文档拆到 `references/`，正文只留索引。

---

## 4. 命名与菜单

- 导入后，DSH 的技能名 = frontmatter `name`。
- 默认斜杠命令名 = `name`（例如 `dsh-plugin-product-framework`）。
- 命令名规则与技能名相同：小写字母、数字、连字符。
- 同一份列表里不能有两个同名技能，也不能有两个相同命令名；重复会被拒绝。
- 命令名可以在插件页面里改；改完立即重新注册。
- 命令名和 DSH 内置命令（`compact`、`permission`、`model`、`export`、`agent-teams` 等）冲突时，注册会失败并在页面上显示错误；换一个命令名即可。
- 关掉「加入 / 菜单」只移除命令，不删技能，也不影响文件。

---

## 5. 校验规则

### 5.1 拒绝（errors）

- 路径不是绝对路径、不是文件夹、文件夹不存在；
- 根目录没有 `SKILL.md`；
- `SKILL.md` 读不出来、不是 UTF-8、超过 1 MB；
- 没有 frontmatter，或 frontmatter 没有闭合；
- `name` 缺失 / 不匹配 kebab-case / 超过 64 字符；
- `description` 缺失 / 超过 4096 字符。

### 5.2 提醒（warnings）

- 文件夹名和 `name` 不一致（建议改成一致）；
- 没有 `references/`、`scripts/`、`templates/` 任何一个（允许，但不利于复用）；
- 存在符号链接（不会被编辑器跟随）；
- 文件数超过 2000（页面只列一部分）；
- 文件夹总大小超过 20 MB（建议把大资源移出去）。

### 5.3 两个引擎

| 引擎 | 何时使用 | 输出 |
| --- | --- | --- |
| Python | 能找到解释器时（见 README 配置） | `engine: "python"` + Python 版本 |
| JavaScript | 没有 Python，或 Python 执行失败 | `engine: "js"`，并在 warnings 里说明原因 |

两个引擎都返回同一形状：

```json
{
  "ok": true,
  "engine": "python",
  "name": "my-skill",
  "description": "...",
  "folder": "my-skill",
  "errors": [],
  "warnings": [],
  "files": { "count": 12, "bytes": 34567, "text": 9 },
  "scaffolding": ["references", "scripts"],
  "python": "3.14.0"
}
```

---

## 6. 添加之后发生什么

1. 插件的 `config.json` 追加一条记录（绝对路径 + id + name + command + menuEnabled）。
2. 调用 DSH `skills.register(...)`，技能进入运行时层，`skill` 工具立即可用。
3. 调用 DSH `commands.register(...)`，`/` 菜单多一条命令；点击后向会话注入「加载该技能」的指令。
4. 页面显示文件树，可读取 / 编辑文本文件。

移除时：

1. 调用命令与技能的 disposer；
2. 从 `config.json` 删除记录；
3. 默认不碰磁盘；只有点「连同磁盘文件夹一起删除」并二次确认才 `rm -rf`。

编辑 `SKILL.md` 并保存后，插件会重新读取 frontmatter；`name`/`description`/命令名会同步更新。

---

## 7. 路径与安全

- 配置里只存绝对路径；不复制技能内容。
- 页面读写的每一个相对路径都先规范化，拒绝 `..`、绝对路径、盘符；再用 `realpath` 校验必须位于技能根目录内。
- 不跟随符号链接；只允许保守的文本扩展名；单文件 ≤ 1 MB；二进制 / 非 UTF-8 拒绝。
- 删除保护：盘符根目录、用户主目录、`~/.dsh`、`~/.dsh/skills`、桌面，以及包含这些目录的父目录，一律拒绝。
- 插件不发网络请求，不向模型发送技能全文；只有用户点击 `/` 命令或 `skm_read` 时才会加载。

---

## 8. 作者检查清单

导入前快速过一遍：

- [ ] 是一个真实文件夹，路径为绝对路径；
- [ ] 根目录有 `SKILL.md`；
- [ ] frontmatter 有 `name`、`description`；
- [ ] `name` 是 kebab-case，且和文件夹名一致；
- [ ] 描述写清「做什么 + 什么时候用」；
- [ ] 长文档放进 `references/`，正文只留索引；
- [ ] 脚本放在 `scripts/`，模板放在 `templates/`；
- [ ] 没有把密钥、私人路径、大二进制塞进技能；
- [ ] 在插件页面点一次「运行校验」，没有 errors。

---

## 9. 最小示例

```text
hello-skill/
  SKILL.md
  references/
    examples.md
```

`SKILL.md`：

```markdown
---
name: hello-skill
description: >-
  演示一个最小 DSH 技能：当用户要求打招呼或验证技能加载时使用。
whenToUse: 用户说“用 hello-skill 打个招呼”。
---

# Hello skill

1. 用用户的语言说一句问候。
2. 如果用户要求细节，读取 `references/examples.md`。
3. 不要编造文件内容。

## 约束

- 只做问候，不执行命令。
```


---

## 10. 框架包（framework pack）也是普通技能

`dsh-plugin-product-framework` 更新后是一个 **framework pack**，但它对「小鱼的技能」来说仍然只是一个普通技能文件夹，导入规则不变：

```text
dsh-plugin-product-framework/
  SKILL.md              # 必须；frontmatter name/description
  framework.json        # 框架包元数据，可选；普通技能不需要
  layers/               # 框架自己的分层模板
  references/           # 可选脚手架
  scripts/              # 可选脚手架
  templates/            # 可选脚手架
  integrations/         # 可选
```

- 插件只保存根目录的**绝对路径**并注册 `SKILL.md`；**不会**把 `layers/`、`framework.json` 复制到插件数据目录。
- `framework.json` / `layers/` 不需要特殊处理；它们只是文件夹里的文本文件，会出现在文件树里，可查看/编辑。
- 框架文件更新后：
  - 插件页选中该技能，点「重新读取」；或
  - 完全重启 DSH。
  两种方式都会按磁盘上的最新 `SKILL.md` 重新注册。
- 插件不充当框架的存储层，也不引用其它框架 skill 的 `layers/`；一个文件夹就是一个技能。
