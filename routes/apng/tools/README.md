# APNG 路线工具集

> 来源：pet-forge 的公开 APNG 路线辅助工具。
> 用途：用 AI 视频生成 + 纯色色键抠图做出 APNG 桌宠动画。

---

## 完整管线

```
prompt 模板  →  AI 生参考图  →  AI 生视频(尾帧锚定)  →  色键抠图  →  APNG
   ↑              ↓              ↓                    ↓
prompts/   gen-images.js  gen-video.js           chroma_key.py
                                                       ↓
                                              check_dark.py
                                              fix_gray_bleed.py
                                              rebuild_apng.py
```

---

## ⚠️ 用本路线前必读

1. **需要外部 API key**：图像/视频生成服务通常需要账号、额度或付费计划。
2. **要 Node + Python + ffmpeg**：管线跨两个语言运行时。
3. **AI 生成不可控**：同一 prompt 多次生成也可能得到不同版本。按用户反馈和成本决定是否继续尝试。
4. **循环无缝难做**：相同首尾输入只能提供锚点，成片仍要连续播放检查，必要时后期剪辑。
5. **角色一致性需要锚点图**：参考图（reference image）是保证多状态同一角色的关键。

如果以上任何一条让你觉得"算了"，建议改用 **SVG 路线**（routes/svg）。

---

## 安装

需要 Node.js 18 或更高版本。

### 1. Node 依赖

```powershell
cd pet-forge\routes\apng\tools
npm install
```

依赖：
- `dotenv` —— 读 .env
- 其他都是 Node 内置 (`fetch`, `fs`)

### 2. Python 依赖

```powershell
py -3 -m pip install Pillow numpy
```

### 3. ffmpeg（视频处理）

Windows: 从 https://www.gyan.dev/ffmpeg/builds/ 下载，加到 PATH。

```powershell
ffmpeg -version  # 验证
```

### 4. 配置 API key

```powershell
copy .env.example .env
# 然后用编辑器填入你的 DOUBAO_API_KEY
```

### 5. 测试 API 连通性

```powershell
node test-api.js
```

---

## 使用流程

### 第 1 步：准备参考图（reference image）

先准备一张**主参考图**锁定角色身份；特殊姿势、道具和复杂过渡再增加对应的首帧、尾帧或中间关键帧。参考图数量由动作需要决定。

```powershell
node gen-images.js --prompt "A cute chibi cat, sitting upright, ..." --output reference/main-ref.png
```

当前 Codex 有图像生成能力时，可以直接创建角色母图、补全身体、修改指定姿势或生成关键帧；也可以使用用户指定的网页端或其他工具。无论来源如何，都应保存并复用用户已经选定的实际图片文件。

### 第 2 步：用参考图 + 动作 prompt 生视频

```powershell
node gen-video.js idle-yawn --image reference/main-ref.png --last-frame reference/main-ref.png --api doubao
```

`--last-frame` 是**尾帧锚定**——告诉 AI 视频结束时的形态。它能提高回归目标的稳定性，但相同首尾输入并不能证明成片无缝循环，仍需检查真实首尾、停顿和重复帧。
省略时，循环和回归型状态会自动复用 `--image`；过渡型状态必须显式提供不同的尾帧。
自动后处理会读取状态的 `loop` 字段：循环状态生成无限播放 APNG，一次性状态只播放一遍。

为避免服务端默认值变化，并防止参考图被中心裁剪，建议显式指定输出档位、比例和固定镜头：

```powershell
node gen-video.js idle-yawn `
  --image reference/main-ref.png `
  --last-frame reference/main-ref.png `
  --resolution 1080p `
  --ratio 1:1 `
  --camera-fixed `
  --api doubao
```

参考图、首帧、尾帧和视频应使用相同比例。豆包各比例的实际像素尺寸、输入图片限制与裁剪规则见 [`../conventions/doubao-video-output.md`](../conventions/doubao-video-output.md)。

### 第 3 步：批量生成（带限流）

```powershell
node batch-gen.js --config animations.json
```

`animations.json` 列出所有要生成的动画。`delayMs` 是可配置的提交间隔，应按当前服务限流、排队和账号条件调整。示例：

```json
{
  "delayMs": 60000,
  "jobs": [
    {
      "key": "idle-yawn",
      "image": "reference/main-ref.png",
      "lastFrame": "reference/main-ref.png",
      "api": "doubao",
      "resolution": "1080p",
      "ratio": "1:1",
      "cameraFixed": true,
      "keyColor": "#FF00FF"
    }
  ]
}
```

### 第 4 步：色键抠图 → APNG

默认视频使用绿幕背景 `#00B140`：

```powershell
py chroma_key.py output/idle-yawn/doubao-video.mp4 output/idle-yawn/result.apng
```

支持参数：
- `--plays 0` —— 0 = 无限循环, 1 = 单次播放（默认）
- `--key-color "#00B140"` —— 色键颜色，接受任意 `#RRGGBB`
- `--tolerance 50` —— 颜色容差
- `--fps 8` —— APNG 目标帧率；当前脚本按输入约 24fps 的假设抽帧
- `--height 200` —— 输出高度，宽度按比例缩放
- `--max-colors 192` —— 每帧量化颜色数

后三项是工具默认的有损预览起点，不是通用交付门槛。定稿时按源视频和目标运行时显式选择，例如：

```powershell
py chroma_key.py input.mp4 result.apng --fps 12 --height 400 --max-colors 256
```

这个命令只是较高质量示例，不代表所有主题都必须使用相同参数。完整能力边界和边缘验收见 [`../conventions/chroma-and-edges.md`](../conventions/chroma-and-edges.md)。

角色本身含绿色时，可以让生成 prompt 和自动后处理一起改用洋红：

```powershell
node gen-video.js thinking --image reference/main-ref.png --last-frame reference/main-ref.png --key-color "#FF00FF"
```

显式 `--key-color` 会同时更新视频背景要求，并传给 `chroma_key.py`。抠图只按指定颜色及其容差工作，不会继续额外删除绿色。

### 第 5 步：APNG 后处理（可选）

`chroma_key.py` 使用临时帧目录并在结束时清理。若要处理已经生成的 APNG，先把它解成 PNG 帧：

```powershell
New-Item -ItemType Directory -Force output/idle-yawn/frames | Out-Null
ffmpeg -i output/idle-yawn/result.apng output/idle-yawn/frames/frame_%03d.png
```

如果色键边缘抠不干净，再清理帧。下面沿用前一步示例的 400px / 256 色；实际命令应重复你已经选定的规格：

```powershell
py fix_gray_bleed.py output/idle-yawn/frames output/idle-yawn/frames-fixed --height 400 --max-colors 256
```

如果暗色部分有泄漏：

```powershell
py check_dark.py output/idle-yawn/frames-fixed
```

发现问题帧时命令会返回退出码 `1`，可直接用于自动验证。

如果要重建 APNG（修压缩 / 改帧率）：

```powershell
py rebuild_apng.py output/idle-yawn/frames-fixed output/idle-yawn/result.apng --height 400 --fps 12 --max-colors 256 --plays 0
```

`fix_gray_bleed.py` 和 `rebuild_apng.py` 默认也会缩放到 200px、量化到 192 色；后者默认 8fps。省略这些参数会覆盖前一步选择的更高规格。

---

## 文件说明

| 文件 | 作用 |
|---|---|
| `gen-images.js` | Doubao / Volcengine 生图入口 |
| `gen-video.js` | Doubao / Volcengine 生视频入口，支持首尾帧锚定参数 |
| `batch-gen.js` | 批量视频生成，支持可配置请求间隔 |
| `lib/api.js` | API 客户端封装（Doubao / Volcengine） |
| `test-api.js` | API 连通性测试 |
| `preview.html` | 本地预览页（拖入 APNG/视频/图片即看） |
| `chroma_key.py` | 纯色色键抠图 → APNG（`--plays 1` 单次, `--plays 0` 无限） |
| `check_dark.py` | 检查 PNG 帧目录是否有暗色泄漏 |
| `fix_gray_bleed.py` | 清理透明边缘相邻的半透明冷灰溢出，并按参数重新缩放和量化 |
| `rebuild_apng.py` | 从 PNG 帧目录按指定尺寸、帧率和颜色数重建 APNG |

---

## 常见问题

### API 拥堵 / 失败率高

拉长 `batch-gen.js` 的间隔，或稍后重试。外部 API 的排队、限流、模型能力和价格会变化，发布文档不承诺具体稳定性。

### 视频生成首尾帧对不齐

- 必须用 `--last-frame` 锚定尾帧
- prompt 里强调 "Seamless loop animation — the last frame connects perfectly back to the first frame"
- 实在对不齐，用 ffmpeg 只剪掉逐帧确认过的冗余、停顿或错误边界帧，再做 APNG

### 色键边缘抠不干净

- 检查视频背景颜色是否一致，并从实际视频采样色键
- 用首尾、动作峰值和接缝附近的代表性帧逐步调 `chroma_key.py` 的 `--tolerance`；避免为了清背景而侵蚀细线、发丝或内部小孔
- 实在不行，用 `fix_gray_bleed.py` 后处理
- 进一步的任意色键、固定 alpha 内收与跨片段检查见 [`../conventions/chroma-and-edges.md`](../conventions/chroma-and-edges.md)

### API 限流

- 用 `batch-gen.js` 带间隔批量跑，避免连续请求触发限流。
- 如果 API 经常排队或失败，降低并发或稍后重试。
- AI 视频生成有随机性，失败后重跑是正常流程。

---

## 来源 + 许可

- 本仓库版本去掉了角色专属内容，`prompts/` 给通用模板。
- 许可边界：pet-forge 自写文档/模板/包装代码按 MIT；如后续从其他项目继续搬入代码，需要保留对应来源和许可说明。

---

## ⚠️ AI Agent 注意事项

如果 AI agent 第一次跑这个工具：
- 先跑 `node test-api.js`，确认缺 API key 时也不应出现 `dotenv` / `prompts.js` 缺失。
- 先跑 `node gen-video.js` / `node gen-images.js --list` 看 CLI 帮助和状态列表。
- 用户说“去生图”“再来一版”或指定一批方案时，按该批次执行；不要附加固定图片数、重试数或状态数，也不要静默扩大付费生成范围。
- 真实生成仍依赖用户自己的 API key、余额、ffmpeg 和网络；不要把本地 CLI 可启动说成"全链路已跑通"。
