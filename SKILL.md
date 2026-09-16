---
name: pet-forge
description: Create, repair, validate, and package SVG, APNG, or hybrid desktop pets using pet-forge templates, Codex image generation, animation conventions, state mappings, and generation tools. Use when the user asks to make a desktop pet, create or edit character keyframes, animate idle or agent states, choose an asset route, convert a reference image into a pet asset, or validate and package a multi-state pet.
---

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

弱信号且上下文仍无法判断时，用一句简短问题确认目标；已经能从上下文判断时直接继续。

### 反触发（不要触发）

- 用户已经在做某个具体产品项目，而不是想用 pet-forge 新建角色
- 用户只是在问某个现有桌宠是什么，而不是动手做

---

## 第一轮响应

先从用户已经给出的内容中提取角色、拓扑、审美方向、运行时目标和路线倾向。只询问会实质影响下一步、且上下文里尚未说明的信息；不要把固定问卷当作开工门槛，也不要重复询问已经确定的内容。

当用户还没有表达清楚时，可以围绕这些维度补问：

- **角色是什么**：已有设定、参考图，还是从概念开始；
- **角色拓扑**：主体、脸部、肢体、附属物、道具和支撑关系；
- **审美方向**：风格、材质、描边、色板与参考作品；
- **运行时与路线**：目标尺寸、贴边/悬浮方式，以及 SVG、APNG 或混合路线。

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
   ├─ "自然人物动作 + 精确文字/粒子/符号" → APNG 人物层 + SVG 效果层
   └─ "都想试试" → 先 SVG（启动门槛低），跑通再考虑 APNG
```

---

## SVG 路线工作流（skill 引导）

### 第 0 步：角色拓扑盘点

先不要默认角色一定有完整头、身体、手脚和嘴巴。问清：

- 主体形态：只有头、头+身体、一团主体、道具/物件，还是其他轮廓；
- 脸部结构：有没有眼睛、嘴巴、腮红、表情符号；
- 附属结构：有没有手、脚、耳朵、尾巴、触角、翅膀、道具；
- 支撑关系：站地、悬浮、贴边、挂载，还是靠道具支撑；
- 目标动作：转头、抬低头、眼睛跟随、表情、走路、挥手、弹跳、漂浮。

根据拓扑决定后续读哪些文档：

- 有脸部方向需求 → `routes/svg/conventions/head-motion-axis.md`
- 有主体 / 身体转向需求 → `routes/svg/conventions/body-motion-axis.md`
- 有手脚、尾巴、触角、道具等附属结构 → `routes/svg/conventions/limb-rig-points.md`
- 有嘴巴或多表情系统 → `routes/svg/conventions/expression-mouth-system.md`
- 没有手脚、尾巴、触角或道具时，不要强行套附属结构 rig；退化为主体轮廓、重心 / 悬浮基准和呼吸即可
- 没有嘴巴时，不要强行套 mouth rig；用眼睛、眉毛、腮红、表情符号或整体形变表达情绪

### 第 1 步：确定角色基础造型

根据用户现有素材选择来源：
- 已有 PNG → 直接用；
- 想让 AI 生成或编辑 → 当前 Codex 有图像生成能力时优先直接使用，也可以使用用户指定的其他工具；
- 自己画 → Figma / Procreate / 其他绘图工具。

用户说“去生图”“再画一版”或指定若干方案时，已经授权了这一批图像生成。按请求的范围执行，不额外设置固定张数，也不静默扩大批次。编辑已有角色前先查看输入图片，只修改用户指定的结构或姿势，保留其余识别特征。

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
- 检查输出 SVG 的 path 数量、分组和可编辑性；相对源图或目标运行时明显膨胀时再简化
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
- v1 起手 → 浏览器连续播放多个周期 → 评审
- 跑偏归档 _archive，开 v2
- OK 就锁定，备份 + 写 spec
- 涉及肢体、脸部边缘、尾巴、手脚等变形时，先读 `routes/svg/conventions/rig-first.md`
- 用 tuner 调出的状态，锁定后按 `routes/svg/conventions/tuner-to-canonical.md` 烘焙到 canonical / showcase
- 交付前按 `routes/svg/conventions/validation-runbook.md` 做结构、脚本、嵌入、循环和目标端验证

### 第 5 步：扩展状态

锁定第一个状态后，根据用户给出的范围继续扩展。范围尚未确定时，可以建议先做能验证工作流的相邻状态；用户已经要求完整状态集或一组相关状态时，按该范围推进，不人为限制数量。

### 第 6 步：接桌宠运行时

按 `shared/state-map.md` 配置 theme/state 映射，接入你选择的桌宠运行时。

---

## APNG 路线工作流（skill 引导）

### 第 0 步：先核真实目标

查看目标运行时的状态映射、窗口尺寸、贴边/悬浮位置和 host 位移逻辑。先区分角色素材内部表演与运行时负责的窗口移动。`shared/state-map.md` 的状态库是模板，不自动代表每个产品都必须制作全部状态。

### 第 1 步：建立参考图与关键帧库

- 写 CHARACTER_PREFIX，参考 `routes/apng/prompts/template.js`；
- 先按最大运动范围选择统一画幅；豆包 / Seedance 的比例、实际像素和裁剪规则见 `routes/apng/conventions/doubao-video-output.md`；
- 准备角色身份参考、状态首尾帧、必要的中间关键帧和道具参考；
- 可使用 Codex 内置图像生成创建新图、补全身体、修正姿势、生成方案或编辑指定区域；
- 特殊手势、握持或遮挡连续失败时，补充真人姿势照片、骨架草图或带运行时边界的合成预览；
- 需要后期添加准确文字或符号时，先生成结构完整的空白纸张、卷轴或面板。

用户请求一次图像生成或一批方案即授权该批次。方案数量由用户目标和实际比较需要决定，不设固定上限或固定最小值。详情见 `routes/apng/conventions/workflow.md`。

### 第 2 步：定义动作和首尾关系

- 按 `routes/apng/conventions/loop-and-anchoring.md` 判断 A / B / C；
- 复杂动作按 `routes/apng/conventions/segment-assembly.md` 拆成进入、保持和退出等片段；
- 相邻片段共用同一份中间关键帧；
- prompt 明确图1/图2的输入角色、动作、锁定区域、道具身份、镜头和背景。

### 第 3 步：配置并生成

- 本地工具按 `routes/apng/tools/README.md` 配置；
- 使用豆包 / Seedance 时显式确认 `resolution`、`ratio` 和固定镜头需求；参考图、首尾帧和视频应保持同一画幅、人物尺度、中心轴与脚底线；
- 外部 API 可能需要账号、额度或付费计划；
- 用户已经授权具体生成批次时直接执行，不重复确认；不静默增加尝试次数，不把经验次数写成硬限制；
- 限流、排队和模型能力变化时，根据当前服务反馈调整并发与重试。

### 第 4 步：审核原片

连续播放检查动作、角色和道具身份、人体结构、镜头、背景、首尾帧和停顿。人物变形、增生或错误遮挡通常需要重生成；文字、粒子、跟随位置、颜色和透明边缘通常更适合后期处理。只重做不合格的片段，保留已通过部分。

### 第 5 步：组装和选择速度

先拼接并检查实际接缝，再按用户需要提供多个播放速度。速度档位和方案数量不固定，以完整动作的观感为准。比较速度方案时优先只修改帧时长，不把额外删帧混成第二个变量；最终 APNG 是否降帧、缩放或量化，再按目标运行时决定。

### 第 6 步：透明处理、调色与 SVG 合成

- 色键按角色色域选择，不能默认所有角色都用绿幕；
- `chroma_key.py` 的硬遮罩、软边和去溢色都使用请求的 `--key-color`；仍需用代表性帧调节容差并检查细节侵蚀；
- 按 `routes/apng/conventions/chroma-and-edges.md` 检查 alpha、边缘和跨片段色彩；
- 按 `routes/apng/conventions/hybrid-overlays.md` 添加需要精确定位的文字、符号、粒子和发光。

### 第 7 步：锁定和接运行时

按 `shared/asset-lifecycle.md` 区分关键帧、原片、透明人物层、完整合成、锁定资产和部署件。按 `shared/state-map.md` 配置 theme/state 映射，并在真实尺寸和真实 host 行为下连续播放验证。

---

## skill 应该主动引用的文档

按用户问题类型查文档：

| 用户在问 | 引用 |
|---|---|
| "怎么开始" | README.md |
| "路线怎么选" | README.md §路线 |
| "有没有案例参考" | examples/ |
| "怎么接运行时" | shared/state-map.md |
| "状态有哪些 / 怎么命名" | shared/state-map.md |
| "怎么避免踩坑" | shared/lessons.md + routes/<route>/lessons/pitfalls.md |
| "为啥默认 SVG 不 Canvas" | routes/svg/conventions/svg-vs-canvas.md |
| "为啥每状态一个 .svg.html 不拆" | routes/svg/conventions/single-file.md |
| "概念图 / PNG→SVG / AI 描图 / 初始 SVG 怎么变成动画母版 / 要不要描边 / 可计算角色系统" | routes/svg/conventions/source-to-animation-master.md |
| "角色拓扑 / 只有头 / 没有手脚 / 没有嘴巴 / 主体和附属结构怎么判断" | routes/svg/conventions/source-to-animation-master.md |
| "怎么从 v1 改到 v2 / 锁定流程" | routes/svg/conventions/iteration.md |
| "多状态角色母版怎么建" | routes/svg/conventions/layered-master.md |
| "手脚/脸/尾巴怎么变形不崩" | routes/svg/conventions/rig-first.md |
| "身体转向 / 身体轴 / 配饰跟随 / 手脚怎么接" | routes/svg/conventions/body-motion-axis.md |
| "手部骨骼点 / 伸手 / 手伸进身体 / 抬脚 / 踮脚 / 走路 / 重心轴" | routes/svg/conventions/limb-rig-points.md |
| "表情 / 嘴巴 / 开口嘴 / 惊讶嘴 / thinking 嘴 / 多表情复用" | routes/svg/conventions/expression-mouth-system.md |
| "转头 / 抬头 / 低头 / 眼睛跟随 / 脸部动画 / 视线方向" | routes/svg/conventions/head-motion-axis.md |
| "调参页怎么变成交付文件" | routes/svg/conventions/tuner-to-canonical.md |
| "SVG 状态怎么验收" | routes/svg/conventions/validation-runbook.md |
| "preset 是什么 / 怎么用" | routes/svg/presets/<preset>.md |
| "PNG 怎么转 SVG" | routes/svg/tools/png2svg/README.md |
| "AI 生成 prompt 怎么写" | routes/apng/conventions/workflow.md + routes/apng/prompts/template.js |
| "怎么用 Codex 生母图 / 补全 / 改姿势 / 生关键帧" | routes/apng/conventions/workflow.md §第 1 步：建立参考图与关键帧库 |
| "复杂动作怎么拆段 / 图1图2怎么写 / 怎么拼接 / 怎么选速度" | routes/apng/conventions/segment-assembly.md |
| "豆包 / Seedance 画幅、比例、分辨率、参考图尺寸怎么选 / 1080p 实际多大 / 为什么会裁切" | routes/apng/conventions/doubao-video-output.md |
| "色键怎么选 / 非绿幕怎么处理 / 透明边缘和跨片调色" | routes/apng/conventions/chroma-and-edges.md |
| "APNG 上怎么叠文字、符号、粒子和发光" | routes/apng/conventions/hybrid-overlays.md |
| "原片、透明层、合成和部署分别算什么阶段" | shared/asset-lifecycle.md |
| "AI 生视频常见翻车" | routes/apng/lessons/pitfalls.md |
| "失败重跑 / API 限流" | routes/apng/lessons/pitfalls.md |

---

## skill 应该按需提醒的事

按情况点出（不要全堆一次说）：

1. **先验证工作流再扩展**：范围开放时可先磨一个 hero 状态；用户已明确要求批量时按该范围执行
2. **改前先备份**：cp 一份 -backup-YYYY-MM-DD
3. **跑偏方向归档不删**：_archive/ 留追溯
4. **连续播放多个周期**：静帧好看不等于循环好看
5. **角色一致性是工程问题**：library/ 资产 (SVG) / CHARACTER_PREFIX (APNG) 钉死锚点
6. **对外交付先核真实目标**：看 runtime / showcase / public asset 后再判断 bug、遗漏或新增 scope
7. **不同阶段分别验收**：原片、透明人物层、完整合成和运行时资产不能互相替代

---

## skill 不应该做的事

- ❌ **不要在未获授权时消耗外部生成额度**：用户对具体批次的生成要求就是该批次的授权；不要重复确认，也不要静默扩大批次
- ❌ **不要发明固定数量限制**：图片方案数、生成尝试数、状态数和速度档位由用户目标、成本与实际结果决定
- ❌ **不要凭空写整只角色的 SVG path**：AI 生图 / 手绘 / png2svg 可以起稿，但交付级 SVG 要回到分层母版、可读路径和稳定锚点
- ❌ **不要替用户决定审美**：preset 给档位，最终视觉用户拍板
- ❌ **不要保证"一键生成完整多状态角色"**：先验证共享资产和流程；用户已指定批量范围时，仍应按该范围完成。
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
- v0.3（2026-09-15）：补 Codex 生图、关键帧库、分段组装、速度选择、任意色键边界、跨片调色、APNG+SVG 混合合成和素材生命周期
- v0.4 计划：用不同拓扑角色继续验证通用性

当前进度详见 `CLAUDE.md` §Current Status。
