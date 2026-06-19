# pet-forge

用于制作自定义 SVG / APNG 桌宠的工具、模板和工作说明。

pet-forge 可以作为独立工具包使用，也可以作为 Codex skill 使用。它不是成品角色包，而是一套可复用的路线指南、prompt 模板、SVG 约定、APNG 后处理脚本、示例和状态映射说明。

## 路线

```
[SVG 路线]                          [APNG 路线]

参考图                               prompt 模板
   -> 去背景                            -> AI 参考图
   -> PNG 转 SVG                        -> 首尾帧锚定的 AI 视频
   -> preset + SVG 模板                 -> 绿幕抠图
   -> 自包含 .svg.html                  -> .apng
```

| 主题 | SVG 路线 | APNG 路线 |
|---|---|---|
| 成本 | 本地环境装好后免费 | 使用免费或付费生成 API |
| 可控性 | 高，每个关键帧都能改 | 较低，重跑很常见 |
| 循环 | 精确 CSS 循环 | 依赖首尾帧锚定 |
| 文件大小 | 通常较小 | 通常数百 KB 或更大 |
| 适合 | 清晰矢量桌宠、小运行时文件 | 丰富视觉风格、快速草稿 |

如果你想要精确循环、小文件和可编辑动画逻辑，选 SVG。

如果你想快速探索丰富视觉风格，并且能接受生成 API 和后处理，选 APNG。

## 作为 Codex Skill 使用

本仓库包含 `SKILL.md`，因此 Codex 可以在规划或制作 SVG / APNG 桌宠资产时把 pet-forge 当作 skill 使用。这个 skill 会把 Codex 引导到仓库里的路线文档、模板、工具、示例和约束，而不是把任务当成从零生成。

当你希望 Codex 帮你选择路线、把透明 PNG 转成 SVG、准备 APNG 生成 prompt、把生成视频后处理成 APNG，或接一个小型可运行 demo 时，可以使用它。

## 先做角色拓扑盘点

在套用头部、附属结构、嘴巴或身体约定之前，先盘点角色真实拥有什么结构。不要默认每个桌宠都有完整的头、身体、手脚和嘴巴。

```mermaid
flowchart TD
  A["概念图 / 透明 PNG / 初始 SVG"] --> B["询问角色拓扑"]
  B --> C["主体形态：只有头、头+身体、软团/物件，还是其他轮廓？"]
  B --> D["脸部：眼睛、嘴巴、腮红、表情符号？"]
  B --> E["附属结构：手、脚、耳朵、尾巴、触角、道具？"]
  B --> F["支撑关系：接地、悬浮、贴边，还是由道具支撑？"]
  B --> G["需要的动作：视线方向、表情、走路、挥手、弹跳、漂浮？"]

  C --> H["只为角色需要的结构建立合同"]
  D --> I["有脸部 / 嘴巴结构时才建 face plane / mouth rig"]
  E --> J["只为真实存在的附属结构建立锚点"]
  F --> K["按需要选择身体轴、重心、接触线或悬浮锚点"]
  G --> L["读取对应 SVG convention 文档"]

  H --> M["工程化母版：图层、id、origin、验证"]
  I --> M
  J --> M
  K --> M
  L --> M
```

例如：只有头的角色可能需要 face plane 和表情规则，但不需要脚部 rig；软团角色可能需要轮廓轴、悬浮锚点和 squash 规则，但没有嘴巴；完整吉祥物可能同时需要脸部、身体、附属结构和表情合同。

## 演示：同一张参考图，两条 SVG 路线

用同一张参考图，对比 pet-forge 两种得到 SVG 的方式：工具路线（png2svg + vtracer 追踪），和直接交给 GPT-5.5 Pro 生成。

<table>
  <tr>
    <th align="center" width="33%">参考图 · 源 PNG</th>
    <th align="center" width="33%">工具路线 · <code>png2svg + vtracer</code></th>
    <th align="center" width="34%">GPT-5.5 Pro · 直接生成</th>
  </tr>
  <tr>
    <td align="center"><img src="examples/svg-gpt-pear/source.png" width="220" alt="源参考 PNG"></td>
    <td align="center"><img src="examples/svg-gpt-pear/pear.svg" width="220" alt="vtracer 追踪生成的 SVG"></td>
    <td align="center"><img src="examples/svg-gpt-pear/pear-gpt-5.5-pro.svg" width="220" alt="GPT-5.5 Pro 直接编写的 SVG"></td>
  </tr>
  <tr>
    <td align="center">真 alpha 透明 PNG。不要用带棋盘格背景的截图，否则背景也会被矢量化。</td>
    <td align="center">清理透明像素、限制颜色数后，vtracer 按颜色区域追踪路径。轮廓还原得不错，但眼睛高光、笑嘴、舌头被压扁，path 也没有语义。</td>
    <td align="center">模型重画的结构化 SVG：渐变身体、干净的五官、命名图层。更接近成品，但是模型自己的诠释，不是逐像素还原。</td>
  </tr>
</table>

| 维度 | 工具路线（vtracer 追踪） | GPT-5.5 Pro 直接生成 |
|---|---|---|
| 输入 | 透明 PNG | 参考图（可加文字描述） |
| path 数量 | 13 条匿名 path | 15 条带语义 id 的 path |
| 文件大小 | 约 21 KB | 约 12 KB |
| 结构 | 扁平，无分组 | 分组（`plant-and-limbs` / `body` / `face`），图层命名 |
| 填充 | 纯色 | 渐变 + 高斯模糊 + `clipPath` |
| 可动画性 | 低，path 无语义，难按部位绑定 | 高，眼睛 / 嘴巴 / 手臂 / 腿可单独驱动 |
| 保真度 | 轮廓接近源图，脸部细节有损 | 模型自己的诠释，非像素级还原 |
| 无障碍 | 无 | 带 `title` / `desc`（ARIA） |

**有条件的话，建议优先用 GPT-5.5 Pro 这类前沿模型直接生成 SVG**：输出结构更干净、分好图层、可直接绑定动画。如果没有，工具路线（vtracer 追踪）是完全可用的替代方案，只是脸部等细节需要后续手工清理。两种产物都能复制进 `routes/svg/templates/hello-idle.svg.html` 里调 CSS 变量和动画。

复现工具路线（从仓库根目录）：

```powershell
py -3.13 routes\svg\tools\png2svg\png2svg.py examples\svg-gpt-pear\source.png examples\svg-gpt-pear\pear.svg --preset apple-precise
```

这次运行生成 13 条 SVG path、约 21 KB。关键是源图必须是真透明 PNG；带棋盘格背景的截图会把棋盘格也矢量化，输出会很差。

可运行文件：

- 参考图（源 PNG）：`examples/svg-gpt-pear/source.png`
- 工具路线 SVG：`examples/svg-gpt-pear/pear.svg`
- GPT-5.5 Pro SVG：`examples/svg-gpt-pear/pear-gpt-5.5-pro.svg`（GPT-5.5 Pro 直接生成，已去掉白底改为透明背景）
- 可运行 idle demo：`examples/svg-gpt-pear/idle.svg.html`

`examples/svg-soft-orb/` 是一个更小的合成基准 demo，用来对比手工低色数源图和 GPT 生成源图。

## 快速开始

### SVG 路线

```powershell
git clone <pet-forge-repo>
cd pet-forge

# 在浏览器里打开初始 SVG 桌宠：
# routes\svg\templates\hello-idle.svg.html

# 可选：如果 PNG 不是透明背景，先去背景。
py -3.13 -m pip install "rembg[cpu,cli]"
py -3.13 -m rembg i your-character.png your-character-clean.png

py -3.13 -m pip install Pillow numpy scipy vtracer
py -3.13 routes\svg\tools\png2svg\png2svg.py your-character-clean.png character.svg --preset apple-precise
```

然后把生成的 SVG path 复制进 `routes/svg/templates/hello-idle.svg.html`，再调 CSS 变量和 preset。

PNG 转 SVG 这一步使用 vtracer 作为矢量化引擎。它最适合简单、低色数、边界干净的图形；复杂照片、渐变、毛发、纹理和噪点边缘可能生成巨大或很差的 SVG。源图复杂时，优先走 APNG 路线，或手工重画关键 SVG 结构。

### APNG 路线

```powershell
git clone <pet-forge-repo>
cd pet-forge\routes\apng\tools

npm install
py -3 -m pip install Pillow numpy

copy .env.example .env
# 在 .env 里填写你的 API key。

node test-api.js
node gen-images.js --prompt "A cute chibi ..." --output reference/main-ref.png --api doubao
node gen-video.js idle-dozing --image reference/main-ref.png --last-frame reference/main-ref.png --api doubao
```

如果需要手动重跑绿幕抠图：

```powershell
py chroma_key.py output/idle-dozing/doubao-video.mp4 output/idle-dozing/result.apng --plays 0
```

## 仓库结构

```
pet-forge/
├── README.md
├── SKILL.md
├── CLAUDE.md
├── routes/
│   ├── svg/
│   │   ├── presets/
│   │   ├── templates/
│   │   ├── conventions/
│   │   ├── lessons/
│   │   └── tools/png2svg/
│   └── apng/
│       ├── prompts/
│       ├── conventions/
│       ├── lessons/
│       └── tools/
├── shared/
└── examples/
```

## 本仓库不做什么

- 不包含成品角色资产。
- 不附带私有源项目文件。
- 不提供 API key，也不替你支付生成服务费用。
- 不替你决定最终审美。
- 不承诺一键生成完整多状态桌宠。

## 许可

本仓库的文档、模板和原创包装代码使用 MIT 许可。见 [LICENSE](LICENSE)。

部分脚本改编自早期内部原型；公开发布时应在适用位置保留来源和署名说明。角色设计、生成图和产品资产与本工具包分离，不包含在仓库内。
