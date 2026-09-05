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
3. **AI 生成不可控**：同一 prompt 跑 5 次出 5 个版本。失败重跑是常态。
4. **循环无缝难做**：AI 生视频首尾帧大概率对不齐，需要后期剪辑。
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

每个角色需要一张**主参考图**（标准首帧 / 尾帧），保证多状态视觉一致。

```powershell
node gen-images.js --prompt "A cute chibi cat, sitting upright, ..." --output reference/main-ref.png
```

或者你也可以用网页端图像生成工具手动生成参考图。网页生成更直观，但跨状态一致性可能更难保证。

### 第 2 步：用参考图 + 动作 prompt 生视频

```powershell
node gen-video.js idle-yawn --image reference/main-ref.png --last-frame reference/main-ref.png --api doubao
```

`--last-frame` 是**尾帧锚定**——告诉 AI 视频结束时的形态。这是保证循环无缝的关键技巧。
省略时，循环和回归型状态会自动复用 `--image`；过渡型状态必须显式提供不同的尾帧。
自动后处理会读取状态的 `loop` 字段：循环状态生成无限播放 APNG，一次性状态只播放一遍。

### 第 3 步：批量生成（带限流）

```powershell
node batch-gen.js --config animations.json
```

`animations.json` 列出所有要生成的动画。带 60s 间隔避免 API 限流。最小示例：

```json
{
  "delayMs": 60000,
  "jobs": [
    {
      "key": "idle-yawn",
      "image": "reference/main-ref.png",
      "lastFrame": "reference/main-ref.png",
      "api": "doubao",
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

角色本身含绿色时，可以让生成 prompt 和自动后处理一起改用洋红：

```powershell
node gen-video.js thinking --image reference/main-ref.png --last-frame reference/main-ref.png --key-color "#FF00FF"
```

显式 `--key-color` 会同时更新视频背景要求，并传给 `chroma_key.py`。抠图只按指定颜色及其容差工作，不会继续额外删除绿色。

### 第 5 步：APNG 后处理（可选）

如果色键边缘抠不干净：

```powershell
py fix_gray_bleed.py output/idle-yawn/frames output/idle-yawn/frames-fixed
```

如果暗色部分有泄漏：

```powershell
py check_dark.py output/idle-yawn/frames-fixed
```

发现问题帧时命令会返回退出码 `1`，可直接用于自动验证。

如果要重建 APNG（修压缩 / 改帧率）：

```powershell
py rebuild_apng.py output/idle-yawn/frames-fixed output/idle-yawn/result.apng --fps 8 --plays 0
```

---

## 文件说明

| 文件 | 作用 |
|---|---|
| `gen-images.js` | Doubao / Volcengine 生图入口 |
| `gen-video.js` | Doubao / Volcengine 生视频入口，支持首尾帧锚定参数 |
| `batch-gen.js` | 批量视频生成，带 60s 间隔避免限流 |
| `lib/api.js` | API 客户端封装（Doubao / Volcengine） |
| `test-api.js` | API 连通性测试 |
| `preview.html` | 本地预览页（拖入 APNG/视频/图片即看） |
| `chroma_key.py` | 纯色色键抠图 → APNG（`--plays 1` 单次, `--plays 0` 无限） |
| `check_dark.py` | 检查 PNG 帧目录是否有暗色泄漏 |
| `fix_gray_bleed.py` | 只清理透明边缘相邻的半透明冷灰溢出，保留不透明角色灰色 |
| `rebuild_apng.py` | 从 PNG 帧目录重建 APNG（修压缩/改帧率） |

---

## 常见问题

### API 拥堵 / 失败率高

拉长 `batch-gen.js` 的间隔，或稍后重试。外部 API 的排队、限流、模型能力和价格会变化，发布文档不承诺具体稳定性。

### 视频生成首尾帧对不齐

- 必须用 `--last-frame` 锚定尾帧
- prompt 里强调 "Seamless loop animation — the last frame connects perfectly back to the first frame"
- 实在对不齐，用 ffmpeg 剪辑掉前 5-10 帧或后 5-10 帧再做 APNG

### 色键边缘抠不干净

- 检查视频背景颜色是否一致，并从实际视频采样色键
- 调 `chroma_key.py` 的 `--tolerance`（默认 50，可加到 70）
- 实在不行，用 `fix_gray_bleed.py` 后处理

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
- 真实生成仍依赖用户自己的 API key、余额、ffmpeg 和网络；不要把本地 CLI 可启动说成"全链路已跑通"。
