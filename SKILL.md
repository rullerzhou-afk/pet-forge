# pet-forge skill —— 触发条件 + 调用流程

> 给 AI coding agent 看的 skill 接入文档。当用户说"我想做桌宠"时，agent 应该按本文件的指引响应。

---

## 触发条件

当用户消息中出现以下信号时，激活 pet-forge skill：

### 强信号（必触发）

- "我想做（自己的 / 一个）桌宠"
- "做个 SVG 桌宠 / APNG 桌宠"
- "帮我做一个 idle 动画"
- "怎么做桌宠"
- "桌宠 [角色名]，[风格]"

### 弱信号（询问后再决定）

- "我喜欢某个现有桌宠案例"（可能想要 fork 而不是做新的）
- "想做个动画"（可能不是桌宠，可能是其他动画）
- "做个角色"（可能是设计需求，不是动画）

弱信号触发时反问：**"你是想做一个会循环动 + 接桌宠运行时的角色吗？还是只是单帧动画/设计图？"**

### 反触发（不要触发）

- 用户已经在做某个具体产品项目，而不是想用 pet-forge 新建角色
- 用户只是在问某个现有桌宠是什么，而不是动手做

---

## 第一轮响应模板

skill 触发后，Claude 第一句话不要写代码，先**确认 3 件事**：

1. **角色是什么**："你想做的角色是什么？（例：橘猫 / 机器人 / 蘑菇 / 你已有的设定...）"
2. **审美方向**："想要什么风格？（例：苹果精致风 / 像素风 / 蹦跳多巴胺 / 禅宗极简 / 你给参考图）"
3. **路线倾向**："你想要 SVG 还是 APNG？两者特性差异大：[列两路线对比表]，没想好的话先选 SVG（不付费、可热改）"

---

## 路线选择决策树

```
用户回答"想要..."
   │
   ├─ "循环完美 / 不付费 / 可热改" → 推荐 SVG 路线
   ├─ "快出成品 / 不在乎钱 / 风格化强" → 推荐 APNG 路线
   ├─ "不会写代码" → 推荐 APNG 路线（prompt 工程门槛低于前端动画）
   ├─ "想要精致圆润矢量感" → SVG 路线 + apple-precise preset
   ├─ "想要像素感" → SVG 路线 + pixel-art preset
   └─ "都想试试" → 先 SVG（启动门槛低），跑通再考虑 APNG
```

---

## SVG 路线工作流（skill 引导）

### 第 1 步：确定角色基础造型

询问用户：
- "你的角色基础造型在哪？" 三选项：
  - A: 已有 PNG → 直接用
  - B: 想 AI 生 → 推荐 ChatGPT / Claude 网页 / Midjourney 自己生（skill 不调 API）
  - C: 自己画 → Figma / Procreate / 等等

**关键**：保证用户拿到一张**透明背景 PNG**。如果不是透明，引导用户用 `rembg` 处理：

```powershell
py -3.13 -m pip install "rembg[cpu,cli]"
py -3.13 -m rembg i input.png input-clean.png
```

提醒：`rembg` 是外部可选工具，首次运行会下载模型；不要把它当作 pet-forge 内置依赖。

### 第 2 步：PNG → SVG

引导用户跑 png2svg（`routes/svg/tools/png2svg/`）：
- 提醒环境陷阱（必须 py 3.13）
- 说明核心矢量化引擎是 vtracer；pet-forge 只做透明像素清理、去背景兜底、量化、缩放和 preset 包装
- 用 `--preset` 选择合适的预设（apple-precise / pixel-art / high-detail）
- 推荐命令：`py -3.13 png2svg.py input-clean.png character.svg --preset apple-precise`
- 检验输出 SVG 的 path 数量（< 50 个理想，> 200 个建议简化）
- 明确提醒：PNG→SVG 只适合简单、低色数、边界干净的图形；照片、复杂插画、毛发、强渐变、纹理和噪点图会 path 爆炸或转坏，建议改走 APNG 或手工重画关键 SVG 结构
- 把 AI 参考图当作 storyboard / 粗轮廓输入，不要把整图矢量化结果直接当交付母版；交付级 SVG 仍要整理图层、命名、锚点和可动画路径

### 第 3 步：套 preset + hello-idle 模板

把 `routes/svg/templates/hello-idle.svg.html` 复制为 `<state>-v1.svg.html`：
- 把 `<g id="pet">` 里的占位圆 + 眼睛**替换**成 PNG→SVG 出来的角色
- 调 CSS 变量套 preset（apple-precise / pixel-art）
- 浏览器双击打开看效果

如果角色已有分层母版，优先从母版复制部件，不要从旧导出状态反向改回源文件。
多状态角色开工前先读 `routes/svg/conventions/layered-master.md`，把母版、library、状态导出页分清。

### 第 4 步：磨制 idle 状态

按 `routes/svg/conventions/iteration.md` 流程：
- v1 起手 → 浏览器循环看 30s+ → 评审
- 跑偏归档 _archive，开 v2
- OK 就锁定，备份 + 写 spec
- 涉及肢体、脸部边缘、尾巴、手脚等变形时，先读 `routes/svg/conventions/rig-first.md`
- 用 tuner 调出的状态，锁定后按 `routes/svg/conventions/tuner-to-canonical.md` 烘焙到 canonical / showcase
- 交付前按 `routes/svg/conventions/validation-runbook.md` 做结构、脚本、嵌入、循环和目标端验证

### 第 5 步：扩展状态

锁定 idle 后，**问用户下一个状态做哪个**：
- 推荐顺序：idle → typing → thinking → sleeping → happy
- 每个状态重复磨制流程
- 不要一次铺 5 个状态规划

### 第 6 步：接桌宠运行时

按 `shared/state-map.md` 配置 theme/state 映射，接入你选择的桌宠运行时。

---

## APNG 路线工作流（skill 引导）

### 第 1 步：确定角色 + 准备主参考图

引导用户：
- 写 CHARACTER_PREFIX（参考 `routes/apng/prompts/template.js` 模板）
- 生 1 张主参考图（gen-images.js 或 ChatGPT 网页）
- 检验：标准姿势 / 中性表情 / 纯绿幕 #00B140

### 第 2 步：环境配置

- `npm install` （Node 依赖）
- `pip install Pillow numpy`（Python 依赖；APNG 拼接依赖 ffmpeg）
- 装 ffmpeg
- copy .env.example .env，填入 API key

**警告用户**：
- 外部生成 API 通常需要账号、额度或付费计划
- 外部 API 的限流、排队和模型能力会变化，必要时降低并发或稍后重试
- 失败重跑是常态，单状态预算 3 次

### 第 3 步：生第一个视频

引导用户：
- 改 prompt 模板的 ANIMATIONS 表，挑一个状态（推荐 `idle-dozing`）
- 跑 `node gen-video.js idle-dozing --image <主参考图> --last-frame <主参考图> --api doubao`
- 看输出 mp4，检验 4 大翻车类型（变形 / 镜头 / 加手 / 背景）

### 第 4 步：抠图 → APNG

`py chroma_key.py output/idle-dozing/doubao-video.mp4 output/idle-dozing/result.apng --plays 0`

后处理（按需）：
- 灰边：`fix_gray_bleed.py`
- 暗色泄漏：`check_dark.py`
- 文件太大：`rebuild_apng.py --fps 12`

### 第 5 步：扩展 + 接运行时

跟 SVG 路线后半相同。按 `shared/state-map.md` 配置 theme.json。

---

## skill 应该主动引用的文档

按用户问题类型查文档：

| 用户在问 | 引用 |
|---|---|
| "怎么开始" | README.md |
| "两条路线怎么选" | README.md §两条路线 |
| "有没有案例参考" | examples/ |
| "怎么接运行时" | shared/state-map.md |
| "状态有哪些 / 怎么命名" | shared/state-map.md |
| "怎么避免踩坑" | shared/lessons.md + routes/<route>/lessons/pitfalls.md |
| "为啥默认 SVG 不 Canvas" | routes/svg/conventions/svg-vs-canvas.md |
| "为啥每状态一个 .svg.html 不拆" | routes/svg/conventions/single-file.md |
| "怎么从 v1 改到 v2 / 锁定流程" | routes/svg/conventions/iteration.md |
| "多状态角色母版怎么建" | routes/svg/conventions/layered-master.md |
| "手脚/脸/尾巴怎么变形不崩" | routes/svg/conventions/rig-first.md |
| "调参页怎么变成交付文件" | routes/svg/conventions/tuner-to-canonical.md |
| "SVG 状态怎么验收" | routes/svg/conventions/validation-runbook.md |
| "preset 是什么 / 怎么用" | routes/svg/presets/<preset>.md |
| "PNG 怎么转 SVG" | routes/svg/tools/png2svg/README.md |
| "AI 生成 prompt 怎么写" | routes/apng/conventions/workflow.md + routes/apng/prompts/template.js |
| "AI 生视频常见翻车" | routes/apng/lessons/pitfalls.md |
| "失败重跑 / API 限流" | routes/apng/lessons/pitfalls.md |

---

## skill 应该提醒的 6 件事（顺其自然，不要每次说）

按情况点出（不要全堆一次说）：

1. **不要一上来铺 21 状态**：先做 1 个 hero 状态磨到位
2. **改前先备份**：cp 一份 -backup-YYYY-MM-DD
3. **跑偏方向归档不删**：_archive/ 留追溯
4. **浏览器循环看 30s+**：静帧好看 ≠ 循环好看
5. **角色一致性是工程问题**：library/ 资产 (SVG) / CHARACTER_PREFIX (APNG) 钉死锚点
6. **对外交付先核真实目标**：看 runtime / showcase / public asset 后再判断 bug、遗漏或新增 scope

---

## skill 不应该做的事

- ❌ **不要替用户调生成 API**：API key 是用户的，付费是用户的，违规过滤是用户的
- ❌ **不要凭空写整只角色的 SVG path**：AI 生图 / 手绘 / png2svg 可以起稿，但交付级 SVG 要回到分层母版、可读路径和稳定锚点
- ❌ **不要替用户决定审美**：preset 给档位，最终视觉用户拍板
- ❌ **不要保证"一键生成完整多状态角色"**：先做 1 个 hero 状态磨到位，再扩展。
- ❌ **不要把任何现有产品角色资产直接复制给用户**：除非对应资产明确允许复用。

---

## 反馈循环

skill 跑通后，记录用户的实际工作流偏差：

- 如果多个用户卡在某一步，说明文档不够 → 改对应 routes/ / shared/
- 如果某个 preset 反复被改，说明默认值偏 → 调 preset 默认参数
- 如果用户绕过 hello-idle 直接写状态，说明模板不够吸引 → 改 hello-idle 增加体验

skill 不是写完就完，是个**慢慢迭代的产品**。

---

## 版本

- v0.1（2026-05-02 初版）：双路线骨架铺完，hello-idle 模板入库，APNG 路线工具完成迁移与基础入口修正
- v0.2（2026-06-17）：补 SVG 分层母版、rig-first、tuner→canonical、验证 runbook、scripted SVG 嵌入、mini host 分工、APNG 绿幕/边缘质量经验
- v0.3 计划：长出第三只完全不同形态的桌宠（橘猫 / 机器人）证明通用性

当前进度详见 `CLAUDE.md` §当前进度。
