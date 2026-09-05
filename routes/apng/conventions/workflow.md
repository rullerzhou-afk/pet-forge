# APNG 路线工作流

> 完整管线 + 每步的工具 + 常见坑 + 元教训。面向 APNG 桌宠工作流整理。

---

## 管线总览

```
[规划]
   │
   ▼
[1. 准备参考图]
   │  AI 生 1 张主参考图 / 自己画 / 网页生
   ▼
[2. 写 prompt]
   │  CHARACTER_PREFIX + 动作描述 + BG_SUFFIX
   ▼
[3. 生视频]
   │  gen-video.js (--last-frame 锚定) → mp4 (纯色色键背景)
   ▼
[4. 检查 + 重生]
   │  循环节奏 OK ? 动作 OK ? 翻车就重跑
   ▼
[5. 色键抠图 → APNG]
   │  chroma_key.py
   ▼
[6. APNG 后处理（可选）]
   │  fix_gray_bleed.py / check_dark.py / rebuild_apng.py
   ▼
[7. 检验 + 锁定]
   │  浏览器循环看 30s+, OK 就锁
   ▼
[8. 接入桌宠运行时]
   │  按 shared/state-map.md 接运行时 / electron
```

---

## 第 1 步：准备参考图（reference image）

### 为什么必须先有参考图

- AI 生视频的"角色一致性"靠**参考图锚定**
- 没有参考图，每次生视频角色都长不一样
- 参考图通常用作**首帧**（`--image`）或**尾帧**（`--last-frame`）

### 怎么准备

**选项 A：用 gen-images.js（配置的外部 API）**：
```powershell
node gen-images.js --prompt "<CHARACTER_PREFIX 的具体填好版本>" --output reference/main-ref.png
```

**选项 B：网页端图像生成工具**：
- 优点：交互快
- 缺点：网页版可能不存档历史导致一致性更难
- 操作：把 CHARACTER_PREFIX 贴进对话，让 AI 生几张挑一张

**选项 C：自己画 / Figma**：
- 优点：百分百可控
- 缺点：要美术能力

### 主参考图标准

- 角色面向**正面或微侧**（侧面太多导致后续状态侧面错位）
- 标准坐姿 / 站姿（最中性，能转换到其他状态）
- 眼睛**睁开**（闭眼参考图无法做 idle）
- 表情**中性**（笑/哭/惊讶都不适合做主参考）
- 背景使用与角色颜色不冲突的**纯色色键**；默认是绿色 `#00B140`

---

## 第 2 步：写 prompt

模板见 `prompts/template.js`。三段式：

```
[CHARACTER_PREFIX] —— 角色外观（所有状态共享）
[动作描述]         —— 这个状态做什么
[BG_SUFFIX]       —— 背景要求（色键保持纯色）
```

### 动作描述写法

✅ **具体**：`The cat slowly opens its mouth wide in a yawn — tongue curling, eyes squeezing shut.`

❌ **抽象**：`The cat is yawning.`

✅ **强调循环 / 起止**：`Seamless loop, last frame connects to first frame.` / `Returns to the exact starting pose at the end.`

✅ **Negative prompt 防翻车**：
- `DO NOT inflate or balloon the tail` （AI 喜欢把尾巴吹气球）
- `DO NOT rotate or shift the camera angle` （AI 喜欢加镜头运动）
- `NO hands, NO fingers, NO human body parts visible` （AI 喜欢加人手）

### prompt 长度

- 太短：AI 自由发挥过头
- 太长：AI 抓不住重点
- **甜点区：80-150 词**（不含 CHARACTER_PREFIX）

---

## 第 3 步：生视频

### gen-video.js 用法

```powershell
node gen-video.js \
  idle-dozing \
  --image reference/main-ref.png \
  --last-frame reference/main-ref.png \
  --api doubao
```

### 选择 API 和模型

| 场景 | 需要关注的能力 |
|---|---|
| 循环动画（首尾帧必须对齐） | 视频模型需要支持首尾帧锚定 |
| 一次性动画 | 关注动作执行质量和角色一致性 |
| 大量批量生成 | 关注限流、排队、成本和批量稳定性 |
| 测试 / 试错 | 关注低成本、低并发和失败后重跑成本 |

### 单次生成成功率

不同模型、账号额度和时段的成功率会变化。失败后通常**直接重跑**，不要试图修复失败的视频。

---

## 第 4 步：检查 + 重生

每次生完视频立刻看 `preview.html` 或直接看 mp4：

### 通过条件

- [ ] 角色形态跟参考图一致
- [ ] 动作描述被正确执行
- [ ] 背景全程保持选定的纯色色键（无阴影、无遮挡）
- [ ] 循环类：首尾帧位置 + 形态对齐（容差 ±5px）
- [ ] 一次性类：结尾回到中性姿态

### 失败模式 + 应对

| 现象 | 应对 |
|---|---|
| 角色变形 / 不像参考图 | 重跑，加强 CHARACTER_PREFIX |
| 尾巴 / 触角 / 耳朵爆炸放大 | prompt 加 "DO NOT inflate" negative |
| 镜头平移 / 旋转 | prompt 加 "Camera stays still" |
| 背景出现物体 / 阴影 | prompt 加 "Background must remain a uniform solid key-color" |
| 首尾帧错位 | `--last-frame` 锚定，prompt 强调 "Seamless loop" |
| 帧数过少 / 跳帧 | 调长 duration 或换更稳定的可用模型 |

---

## 第 5 步：色键抠图 → APNG

```powershell
py chroma_key.py output/idle/raw.mp4 output/idle/result.apng --plays 0
```

`--plays 0` = 无限循环，`--plays 1` = 单次播放（默认）。

### 色键颜色一致性

默认 prompt 指定 `#00B140`，但 AI 生出来可能略有偏差（`#00B042` / `#00B23E`...）。`chroma_key.py` 默认 tolerance=50 能容忍这种偏差。角色本身含绿色时，应在 `gen-video.js` 传入另一个 `--key-color`；该值会同时用于 prompt 和自动后处理。极端情况可以在采样实际背景后调高 tolerance。

---

## 第 6 步：APNG 后处理（按需）

| 问题 | 工具 |
|---|---|
| 边缘有绿边 / 灰边 | `fix_gray_bleed.py <frames_dir> [fixed_frames_dir]` |
| 暗部色泄漏（深色处看见绿） | `check_dark.py <frames_dir>` 检查 → 手动 mask |
| APNG 文件过大 | `rebuild_apng.py <frames_dir> <out.apng> --fps 8 --max-colors 128` |
| 帧率太快 | `rebuild_apng.py <frames_dir> <out.apng> --fps 8` |

---

## 第 7 步：检验 + 锁定

跟 SVG 路线一样，**浏览器循环看 30s+** 才能锁定。

锁定流程：
- `output/<state>/result.apng` 是当前推荐版本
- `output/<state>/raw.mp4` 保留（万一要重新抠图）
- 跑偏的尝试归档到 `output/<state>/_archive/`

---

## 第 8 步：接入桌宠运行时

按 `shared/state-map.md` 把 APNG 路径填进运行时的状态映射表。

通用 theme 接入方式：
```json
{
  "states": {
    "idle": "<相对路径>/idle.apng",
    "typing": "<相对路径>/typing.apng",
    ...
  }
}
```

---

## 元教训

1. **角色一致性 > prompt 详细度**：CHARACTER_PREFIX 写好一次，所有状态都受益
2. **循环靠 `--last-frame`**：尾帧锚定是 APNG 路线的关键能力
3. **失败重跑是常态**：不要试图"修"失败的视频，直接重跑
4. **色键颜色统一**：参考图、prompt、抠图工具使用同一个、且不与角色冲突的颜色
5. **批量生成带间隔**：`batch-gen.js` 的 60s 间隔不是冗余，是必须
6. **prompt 最后强调一次起止姿态**：放在 prompt 最后效果最好
7. **mini 状态另写 prompt**：mini-idle 不是 idle 的缩小版，是不同姿态
8. **预留预算**：外部生成 API 的价格和成功率会变化，按服务文档预留重跑额度
