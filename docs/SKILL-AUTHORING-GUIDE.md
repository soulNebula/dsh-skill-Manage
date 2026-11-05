# 从一个项目提取框架的指南

> 适用场景：你看到一个实现得不错的项目，想把它“怎么组织、怎么跑通一条链路”提取成一个**独立的框架 skill**，
> 以后做新项目时可以直接调用，而不是复制它的业务代码。
>
> 核心原则：
>
> 1. **提取框架与链路，不复制代码**；
> 2. **一个框架 = 一个独立 skill**，不和其他框架共享层、不合并；
> 3. **不保留原项目名字、业务词、界面文案、源码路径**；
> 4. **文字优先**：写清“为什么这样组织、整条链路怎么走、生产中什么时候用”；
> 5. 代码只保留能说明方法的最小片段，以及让骨架能验证的最小实现。

## 命名：文件夹必须带 `dsh-`

框架 skill 的**文件夹名、frontmatter `name`、`framework.json.id` 必须一致，并且以 `dsh-` 开头**：

```text
mobile-local-engine-framework   →   dsh-mobile-local-engine-framework
my-framework                    →   dsh-my-framework
```

只使用小写字母、数字、连字符；不要下划线、中文、空格。`SKILL.md` 的 `name`、文件夹名、`framework.json.id` 三者不一致时，Skill 管理会告警或命令不稳定。

---

## 0. 先判断值不值得提取

不要看到“代码多”就提取。先问：

- 它有没有清晰的**入口/分层/数据流**？
- 有没有可复用的**工程模式**（任务、模型生成、插件机制、数据同步、UI 壳）？
- 去掉业务字段和界面文案后，还剩下什么？
- 它的**许可证**允许你参考/复用结构吗？
- 你能用一段文字讲清“用户操作 → 系统 → 结果”吗？

如果答案主要是“业务逻辑”，不值得提取；如果答案是“结构、契约、链路、模式”，值得。

---

## 1. 最终产出：和本项目一样的文件列表

提取完成后，新框架应该是这个形状（与当前项目一致）：

```text
<dsh-framework-id>/
├─ SKILL.md                     # 整体框架 + 整条链路 + 怎么想 + 怎么用
├─ framework.json               # 本框架自己的层、变量、intake、验收
├─ references/
│  ├─ 00-framework-map.md       # 整体框架与每层要回答的问题
│  ├─ 01-architecture.md        # 入口、装配、整条链路、目录、打包
│  ├─ 02-contracts.md           # 模块目的、最小签名、不变量、失败语义
│  ├─ 03-patterns.md            # 生产模式：问题 → 方法 → 何时用 → 失败时
│  ├─ 04-security-quality.md    # 信任边界与质量门
│  ├─ 05-checklist.md           # 从骨架到可发布的验收
│  └─ 06-framework-pack-spec.md # 分层规范、独立性、提取流程
├─ layers/
│  ├─ 00-base/                  # 工程底座：包、注册、构建、文档
│  │  ├─ README.md
│  │  └─ files/                 # 按目标项目相对路径放文件
│  ├─ 10-core/
│  ├─ 20-host/
│  ├─ 30-agent/
│  ├─ 40-ui/
│  ├─ 50-tests/
│  └─ 60-http/                  # 可选：只有二进制/流式才需要
├─ scripts/
│  ├─ scaffold.mjs              # 读本目录 framework.json，按层复制
│  ├─ audit.mjs                 # 检查生成的项目
│  └─ new-framework.mjs         # 可选：让这个框架还能继续派生新框架
├─ templates/
│  └─ framework/                # 可选：new-framework 用的骨架
└─ integrations/                # 可选：命令、CI、外部集成
```

**必需**：`SKILL.md`、`framework.json`、`references/00–06`、`layers/`、`scripts/scaffold.mjs`、`scripts/audit.mjs`。

**可选**：`scripts/new-framework.mjs`、`templates/framework/`、`integrations/`。保留它们的好处是“这个框架也能继续派生新框架”；不需要就删，不影响使用。

---

## 2. 读源项目的顺序

不要一上来读业务代码。按这个顺序读，先建立地图：

1. **README / 设计文档 / 架构说明**：它自称怎么分层、解决什么问题。
2. **包清单与构建**：入口、脚本、依赖、构建产物、运行方式。
3. **目录树（2–3 层）**：哪些是 core、哪些是运行时、哪些是 UI、哪些是工具/集成。
4. **运行时装配**：服务怎么创建、怎么注册、怎么销毁；哪些是硬依赖，哪些可选。
5. **API 面**：RPC/HTTP/CLI/命令；输入怎么校验、错误怎么返回。
6. **数据流**：数据存哪、什么时候写、有没有任务/队列/缓存/事件。
7. **测试**：测试在断言什么（契约？算法？UI？打包？）。
8. **外部服务与密钥**：模型、存储、第三方 API、凭据放在哪。
9. **许可证**：能不能参考结构。

产出：一张“模块 → 职责 → 依赖”的草图。后面所有工作都基于它。

---

## 3. 先画“整条链路”，再分层

这是提取的核心。不要先搬文件，先画链路。

填这张表（源项目 → 目标框架）：

| 链路步骤 | 源项目里对应什么 | 这一步的职责 | 目标层 | 目标文件 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 用户动作 | 页面/命令/CLI | 触发 | ui / client | `ui/screens/...` | 有哪些入口？ |
| 请求边界 | API/路由 | 校验、错误 | host | `host/rpc.js` | 信封、鉴权、上限 |
| 用例编排 | service/usecase | 组合能力 | host | `host/features/...` | 是否有任务/缓存 |
| 长任务 | queue/job/worker | 异步、进度、取消 | host | `host/jobs.js` | 哪些操作慢？ |
| 模型/外部 | LLM/检索/转换 | 生成/解析 | host | `host/llm.js`、`generate.js` | 重试、流式、结构化 |
| 纯逻辑 | domain/model | 归一化、算法 | core | `core/model.js`、`algorithms/` | 无 IO |
| 持久化 | DB/文件 | 读写、恢复 | host | `host/store.js` | 原子、锁、路径 |
| 返回/展示 | response/UI | 进度、错误、结果 | ui | `ui/api.js`、页面 | 空/加载/错误 |
| 后续动作 | edit/export/retry | 重试、编辑、导出 | host/ui | — | 幂等、版本 |

写完后你会得到一条从入口到结果再回到界面的完整链路。**这条链路就是新框架的骨架**；层只是把链路上的步骤归类。

---

## 4. 分层判断规则

### core（纯逻辑）

放：实体 schema、normalizer、算法、diff、排序、序列化、id。
判断：**去掉 Node/DOM 后还能不能跑？** 能，就放 core。
不放：文件读写、网络、数据库、UI 状态。

### host（运行时）

放：存储、任务、模型端口、结构化生成、API 边界、设置/凭据、版本。
判断：**这一步需要 IO 或进程能力吗？** 需要，就放 host。
再按“一个文件回答一个问题”拆：store / jobs / llm / generate / rpc / settings / runtime。

### agent（工具）

放：把 host 能力包装成模型可调用的工具。
判断：**模型需要触发这个能力吗？** 需要，就加工具；不需要，就不要为了“完整”硬加。
工具只做参数校验 → 调 host → 返回 id/摘要；不读写存储、不做长计算。

### ui（界面）

放：页面、api 封装、样式、文案、组件。
判断：**用户需要看/操作吗？** 不需要，就不要加 UI 层。
页面只通过统一 api 访问 host；不拼通道、不拿密钥。

### 可选层

- `60-http`：需要二进制/流式（上传、音频、字体、图片）时才加；
- 其他可选层按源项目的真实能力加（例如“版本检查”“导出”），但**不要为了看起来完整而加**。

一个项目没有 UI 或没有 Agent 是正常的；不要为了凑四层而硬造。

---

## 5. 创建独立框架

在本项目（当前框架）根目录运行：

```bash
node scripts/new-framework.mjs <new-skill-dir> \
  --id dsh-my-framework \
  --name "我的框架" \
  --description "一句话说明它做什么、什么时候用"
```

它只创建 `<new-skill-dir>`，不会改当前框架，也不会引用其他 skill。

然后：

1. 编辑 `<new-skill-dir>/framework.json`；
2. 把源框架按层放进 `layers/<id>/files/`；
3. 写 `references/00–06`；
4. 用 `<new-skill-dir>/scripts/scaffold.mjs` 生成临时项目验证；
5. 在 Skill 管理里**单独导入这个文件夹**。

---

## 6. 填 `framework.json`

它是新框架的“目录 + 参数 + 验收”：

```json
{
  "format": "dsh-framework-pack",
  "version": 1,
  "id": "dsh-my-framework",
  "name": "我的框架",
  "description": "一句话说明它做什么、什么时候用",
  "stack": ["DeepSeek Harness", "Node", "React"],
  "variables": [
    { "name": "NAME", "prompt": "包名", "pattern": "^[a-z][a-z0-9-]{1,62}$", "default": "my-plugin" },
    { "name": "DISPLAY", "prompt": "显示名", "default": "我的插件" }
  ],
  "intake": {
    "mode": "ask-missing",
    "questions": [
      { "id": "goal", "prompt": "这个项目要解决什么问题？", "required": true },
      { "id": "entities", "prompt": "核心实体是什么？", "required": true },
      { "id": "naming", "prompt": "包名/显示名/前缀？", "required": true }
    ]
  },
  "layers": [
    { "id": "00-base", "title": "工程底座", "required": true, "dependsOn": [] },
    { "id": "10-core", "title": "纯逻辑", "required": true, "dependsOn": ["00-base"] },
    { "id": "20-host", "title": "运行时", "required": true, "dependsOn": ["10-core"] },
    { "id": "30-agent", "title": "工具", "required": false, "dependsOn": ["20-host"] },
    { "id": "40-ui", "title": "界面", "required": false, "dependsOn": ["20-host"] },
    { "id": "50-tests", "title": "测试", "required": true, "dependsOn": ["20-host"] }
  ],
  "entry": { "skill": "SKILL.md", "scaffold": "scripts/scaffold.mjs", "audit": "scripts/audit.mjs" },
  "verify": ["pnpm install", "pnpm test", "pnpm run build"]
}
```

规则：

- `layers` 必须非空；`required` 的层总是被复制；
- 可选层用 `--layers <id>` 选；`dependsOn` 必须已被选中；
- 变量名会变成 CLI 参数和 `__NAME__` 占位符；
- `intake` 决定先问哪些问题，再 scaffold。

---

## 7. 写 `SKILL.md`

它是给未来 AI 看的“框架 + 链路 + 判断方式”，不是代码仓库。建议结构：

1. 这个框架解决什么问题、什么时候用；
2. 整体框架：入口、层、依赖方向；
3. **整条实现链路**：从用户动作到结果再回到界面，逐步写“为什么、失败怎么办、生产上何时会坏”；
4. 每层怎么想、怎么写；
5. 生产中的取舍表；
6. 必守契约；
7. intake；
8. 生成命令；
9. 新增框架；
10. 反模式；
11. 参考文件索引。

硬规则：

- 不出现原项目名字、业务词、界面文案、源码路径；
- 不贴完整实现；代码只保留命令、目录树、必要签名；
- 链路要能独立读懂：不依赖原项目也能理解每一步。

---

## 8. 写 `references/00–06`

固定文件名，统一“回答什么问题”：

| 文件 | 回答 |
| --- | --- |
| `00-framework-map.md` | 整体框架是什么？每层要回答哪些问题？什么该/不该进框架？ |
| `01-architecture.md` | 入口怎么接？服务怎么装？**一次操作完整链路**怎么走？ |
| `02-contracts.md` | 每个模块的目的、最小签名、不变量、失败语义（文字为主） |
| `03-patterns.md` | 生产中遇到什么问题、用什么方法、什么时候用、失败怎么办 |
| `04-security-quality.md` | 信任边界、输入设防、质量门 |
| `05-checklist.md` | 从骨架到可发布的逐项验收 |
| `06-framework-pack-spec.md` | 分层规范、独立性、如何继续提取新框架 |

写法：

- 先写“为什么需要”，再写“怎么做”，最后写“什么时候不该用”；
- 代码只留签名/小片段；不要贴完整实现；
- 不出现原项目名字/业务词；
- 每篇都能单独读懂。

---

## 9. 放 `layers/`

每层：

```text
layers/<id>/
  README.md      # 这一层放什么、依赖谁、什么时候需要
  files/         # 按目标项目相对路径放文件
  WIRE.md        # 可选：需要手动改入口的接线步骤
```

规则：

- 只复制 `files/`；`README.md`/`WIRE.md` 留在 skill 里给 AI 读；
- 文件路径必须是目标项目的相对路径；
- 一层只做一类事；
- 需要改入口/注册表的，写 `WIRE.md`，不要试图自动 patch；
- 只保留**最小可运行骨架**；完整生产实现写进 `references` 文字，不要搬代码；
- 去掉业务字段、界面文案、原项目标识；
- 可选能力放可选层，不要默认塞进 required 层。

示例映射：

| 源项目内容 | 目标层 | 目标文件 |
| --- | --- | --- |
| 包清单/构建/注册 | `00-base` | `package.json`、bundle patch、构建配置 |
| 实体/算法/校验 | `10-core` | `src/core/...` |
| 存储/任务/模型/API | `20-host` | `src/host/...` |
| 工具/命令 | `30-agent` | `src/agent.js` |
| 页面/组件/样式 | `40-ui` | `src/ui/...` |
| 测试 | `50-tests` | `tests/...` |

---

## 10. 脚本与模板

- `scripts/scaffold.mjs`：只读本目录的 `framework.json`，按层复制、替换变量、写 `.framework.json`；
- `scripts/audit.mjs`：检查生成项目的结构、契约、安全、未替换占位符；
- `scripts/new-framework.mjs`：可选；让这个框架还能派生新框架；
- `templates/framework/`：可选；`new-framework.mjs` 的骨架。

不要在一个框架里引用另一个框架的 `layers/` 或脚本。

---

## 11. 验证

```bash
# 1) 生成临时项目
node <new-skill-dir>/scripts/scaffold.mjs <tmp-dir> --name test-plugin --display "测试" --prefix tsp

# 2) 结构检查
node <new-skill-dir>/scripts/audit.mjs <tmp-dir>

# 3) 测试与构建
cd <tmp-dir>
pnpm install
pnpm test
pnpm run build

# 4) 装进独立 DSH_HOME 的测试 profile，走一条真实链路
```

再检查：

- 生成的 `src/` 里没有原项目名字/业务词（`grep` 一遍）；
- 文件列表与本项目一致；
- 没有跨 skill 引用；
- 卸载/删除这个 skill 不影响其他框架。

---

## 12. 导入 Skill 管理

- 在 Skill 管理里选择**新框架文件夹**（绝对路径）；
- 每个框架会得到自己的 `/` 命令；
- 删除/停用只影响它自己；
- 修改 `SKILL.md` 后在页面点“重新加载”或重启。

---

## 13. 常见错误

| 错误 | 后果 | 正确做法 |
| --- | --- | --- |
| 直接复制源项目代码 | 代码量过大，模型照抄业务 | 只留最小骨架，生产细节写文字 |
| 保留原项目名字/业务词 | 模型误判、幻觉 | 全部替换为通用词 |
| 把多个框架合并 | 层互相污染 | 一个框架一个独立 skill |
| 只列模块，不写链路 | 不知道怎么跑通 | 先画完整链路，再分层 |
| 把入口改动写成自动 patch | 脆、难维护 | 写 `WIRE.md` 让 AI 接线 |
| 所有文件塞进一个层 | 找不到边界 | 一层一个主题 |
| 为了“完整”硬加 UI/Agent | 冗余、误导 | 没有就不加 |
| 不写验证命令 | 生成后不可用 | `verify` + 临时项目验证 |
| 不检查许可证 | 法律风险 | 先看 LICENSE |

---

## 14. 快速清单

- [ ] 读完 README/入口/API/数据流/测试/许可证；
- [ ] 画出“用户动作 → 结果 → 界面”的整条链路；
- [ ] 把链路映射到 core/host/agent/ui（没有的层不硬加）；
- [ ] `new-framework.mjs` 生成独立骨架；
- [ ] 填 `framework.json`（layers/variables/intake/verify）；
- [ ] 写 `SKILL.md`（整体框架 + 整条链路 + 思考方式）；
- [ ] 写 `references/00–06`（文字优先，代码最小）；
- [ ] 按层放 `layers/*/files`（目标相对路径）；
- [ ] 需要接线的地方写 `WIRE.md`；
- [ ] 用 `scaffold` 生成临时项目 → `audit` → 测试/构建；
- [ ] grep 原项目名字/业务词，结果为空；
- [ ] 在 Skill 管理里单独导入，走一条真实链路；
- [ ] 删除测试项目，确认不影响其他框架。

---

## 15. 给 AI 的启动提示（可直接复制）

```text
请把 <项目地址/本地路径> 提取成一个独立的框架 skill，
按照本指南的步骤：
先画整条实现链路，再分层，再用 new-framework.mjs 建骨架。
只提取框架、契约、模式与生产取舍，不要复制业务代码；
不要保留原项目名字和业务关键词；代码只保留最小示例。
完成后用 scaffold 生成临时项目，跑 audit、测试、构建，并列出生成的文件列表。
```
