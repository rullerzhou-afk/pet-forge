# APNG 路线经验教训

> 从 APNG 桌宠工作流和多轮 prompt 调优中沉淀。跨角色、跨题材都适用。

---

## ⭐ 核心元教训（按重要性排序）

### 1. 参考图（reference）决定角色一致性

**现象**：每个状态的角色长得不一样，像 25 只不同的猫。

**根本原因**：没有共享参考图作锚点。

**正确做法**：
- 开工前生 1 张**主参考图**（标准姿势 + 中性表情）
- 所有循环类状态用主参考图作 `--image` + `--last-frame`
- 一次性状态（happy / wake）尾帧也用主参考图，确保结束回到 idle

> 实战中建议用 `reference/main-ref.png` 作所有动画首帧/尾帧锚点，跨状态保持视觉统一。

---

### 2. 首尾帧关系决定锚定策略（3 类，不是 2 类）

**现象 a**：循环动画首尾帧不一样，循环时"咔嚓"。
**现象 b**：一次性动画结尾姿态错了（happy 完没回 idle / collapse-sleep 完反而坐起来）。
**现象 c**：过渡动画结尾停在中间姿态。

**根本原因**：把所有动画当成"循环 vs 一次性"两类处理，但实际有 **3 类**：

| 类 | loop | 首尾关系 | --last-frame 用什么 |
|---|---|---|---|
| **A. 循环** | true | 首=尾（同图） | 跟 `--image` 同一张 |
| **B. 一次性·回归型** | false | 首=尾（回原姿） | 跟 `--image` 同一张 |
| **C. 一次性·过渡型** | false | **首≠尾** | **不同的尾帧图** |

C 类是状态间过渡（wake / collapse-sleep / mini-enter），3 个但**关键**——它们是状态机的桥梁。

**正确做法**：
- 使用支持 `--last-frame` / 尾帧锚定的视频模型
- A 类：`--image X --last-frame X` + prompt 强调 "Seamless loop"
- B 类：`--image X --last-frame X` + prompt 强调 "Returns to exact starting pose"（**不写 loop**，否则 AI 会做循环）
- C 类：`--image X --last-frame Y` + prompt 强调 "End pose matches {target state} EXACTLY"（**绝对不写 loop 也不写 returns to starting**）

**详细决策树 + 完整状态分类**：见 `routes/apng/conventions/loop-and-anchoring.md`。

**反面**：不支持尾帧锚定的模型更难做好循环动画和过渡动画。

---

### 3. 失败重跑是常态，不要试图"修"

**现象**：生成的视频角色变形 / 镜头偏 / 颜色错，想 ffmpeg 后期修。

**正确做法**：**直接重跑**。AI 生成有随机性，通常需要为每个状态预留多次尝试。

**反面**：花 2 小时后期修一个差视频 = 重跑 5 次的时间，质量还不如重跑。

---

### 4. Prompt 必须有 negative 段

AI 视频生成最常见 4 类翻车，每类都有专属 negative prompt：

| 翻车现象 | Negative prompt |
|---|---|
| 尾巴 / 触角爆炸性放大 | `DO NOT inflate or balloon the {tail/antenna/etc.}` |
| 镜头平移 / 旋转 | `Camera stays completely still. DO NOT rotate or shift the camera angle.` |
| 加人手 / 道具 | `NO hands, NO fingers, NO human body parts visible.` |
| 背景出现物体 / 阴影 | `The background must remain a uniform solid green. No shadows, no objects, no gradients.` |

**写在 prompt 末尾效果最好**（AI 对末尾指令敏感）。

---

### 5. CHARACTER_PREFIX 写得越具体越好

**现象**：用 "a cute cat" 这种抽象描述，每次生成形态不同。

**正确做法**：CHARACTER_PREFIX 包含 6 个维度：
1. 物种 / 类别
2. 风格定位（chibi / kawaii / pixel-art ...）
3. 主体颜色 / 花纹
4. 主要识别特征（眼睛形状 / 耳朵 / 尾巴）
5. 描边 / 渲染风格
6. 背景要求

> CHARACTER_PREFIX 应该是一段完整角色描述，覆盖所有这些维度。一次写好，所有状态都用。

---

### 6. API 拥堵时降低并发

**现象**：外部 API 排队、限流或连续失败。

拥堵期不要在同一个失败队列里消耗时间。

**应对**：拉长批量任务间隔、降低并发、稍后重试，或按自己的服务账号替换为等价能力的模型。

---

### 7. Mini 状态不是 idle 的缩小版

**现象**：写 mini-idle prompt 想着"就是缩小版 idle"，结果 AI 生成的 mini-idle 画面很奇怪。

**正确做法**：mini-idle 是**完全不同的姿态**：
- main idle = 坐姿 / 站姿
- mini-idle = 趴姿 / 仰躺 / 侧卧 / 卷成球

mini 模式的语义是"在 dock / tray 角落不显眼"，姿态本身就该是收缩 / 放松的。

---

### 8. 绿幕颜色全链路一致

**现象**：参考图绿幕是 `#00FF00`，prompt 写 `#00B140`，抠图工具默认 `#00B140`，结果绿边抠不干净。

**正确做法**：开工前**定一个绿幕颜色**，全链路统一；如果生成视频的实际绿幕偏色，以输出视频里采样到的真实背景色为准：
- 参考图：使用同一绿幕色
- prompt：写同一绿幕色，并要求 uniform solid green
- chroma_key 配置：用参考色或从视频采样出的真实色

**推荐 `#00B140`**：比 `#00FF00` 不容易跟黄绿色花纹冲突。

---

### 9. 批量生成带 60s 间隔

**现象**：连续 10 个 prompt 跑下来，后面 7 个全 429（限流）。

**正确做法**：`batch-gen.js` 默认 60s 间隔，**不要改成更短**。

> 不同服务和账号的限流规则会变化；批量任务应保守设置间隔。

---

### 10. 单状态预算

**经验模型**：
- 单状态通常需要多次生成尝试
- 单状态后期通常包括抠图、检查、重建和锁定
- 具体 API 成本、排队时间和成功率以服务当前文档为准

状态数越多，等待、重跑和人工检验成本会线性放大。先做 1 个 hero 状态，确认路线可行后再扩展。

### 11. 绿幕 prompt 要禁止速度线和地面线索

**现象**：角色动作不错，但背景出现速度线、投影、地面、烟尘或光效，抠图后留下脏边。

**正确做法**：prompt 末尾显式写：

```text
Uniform solid green background only. No shadows, no floor, no speed lines, no motion streaks, no particles, no props, no camera movement.
```

对走路、爬行、跳跃这类横向动作，优先让角色做 treadmill motion：肢体在动，但身体中心基本留在画面中央。真正的窗口位移交给 host。

### 12. 抠图后要做边缘体检

**现象**：APNG 在白底看还行，放到深色桌面上出现灰边、绿边或半透明脏边。

**正确做法**：
- 在浅色、深色、透明棋盘三种背景下看边缘
- 灰边走 defringe / rebuild
- 绿边走 despill 或重新采样 key color
- 半透明阴影如果不是角色本体的一部分，宁可重跑视频

不要只看播放器默认背景。

预览和定稿分两档：

- 快速预览：先用工具默认档，确认动作、构图、绿幕是否值得继续；
- 定稿前：试一次更高质量档，例如 `--height 400 --max-colors 256 --fps 12`；
- 如果体积过大，再按目标 runtime 的限制回调 height、fps 或 colors。

不要用低清预览档直接判断最终边缘质量。

---

## 反模式（don't）

- ❌ **不写 CHARACTER_PREFIX 直接写动作 prompt**：每次生成长得不一样
- ❌ **循环类不用尾帧锚定**：首尾姿态很容易对不齐
- ❌ **失败视频强行 ffmpeg 修**：时间成本高于重跑
- ❌ **绿幕颜色不统一**：抠图阶段必出问题
- ❌ **Prompt 没 negative 段**：AI 翻车 4 大类必踩 1-2 个
- ❌ **批量生成不带间隔**：限流 429 死循环
- ❌ **Mini 状态当 main 的缩小版**：mini 应该是不同姿态
- ❌ **把 host 位移画进 APNG**：贴边、推出、窗口移动交给运行时，APNG 只做原地表演
- ❌ **只在一种背景上看抠图结果**：透明资产必须换背景验边

---

## 进阶心智模型

### "尾帧锚定 + 起止文案"双保险

循环动画必做两件事：

1. **技术层**：`--last-frame` 用首帧图
2. **prompt 层**：末尾加 `Seamless loop animation. The last frame must connect perfectly back to the first frame. The character returns to the exact starting pose.`

少一层都可能翻车。

### "重跑预算"心态

每个状态预留 **3 次生成预算**。不要跑一次就上头改 prompt——AI 生成本身有方差。

跑 3 次取最好的，比改 prompt 跑 1 次质量高得多。

### "按模型能力分工"

- 试 prompt 阶段：优先低成本、低并发、可接受失败的模型
- 正式生产：优先支持关键能力、输出稳定、可复现的模型

这个分工通常比单一路线更稳，也避免把所有状态绑定到一个队列或模型上。

---

## 跟 SVG 路线对比

| 维度 | APNG 路线（本路线） | SVG 路线 |
|---|---|---|
| 单状态时间 | 0.5-2 小时（含等待） | 1 天 - 1 周 |
| 单状态成本 | 取决于外部 API | 本地免费 |
| 微调成本 | 高（要重生） | 低（改 JS） |
| 循环无缝 | 难（要尾帧锚定 + 后期） | 完美（CSS） |
| 风格化能力 | 强（AI 啥都能生） | 弱（受限矢量化） |
| 文件大小 | 几百 KB - 1MB | < 100KB |
| 用户技能 | prompt 工程师 | 前端 + 动画基础 |

**何时选 APNG 路线**：
- 美术能力一般，想快出成品
- 角色风格 SVG 难表达（毛茸茸、写实、复杂渐变）
- 可以接受外部 API 成本和重跑
- 不要求循环完美无缝

**何时选 SVG 路线**：
- 想要循环完美 + 文件小 + 热改
- 美术能力 OK，会写一点 JS
- 想要每个参数都可调
- 想尽量减少外部 API 成本
