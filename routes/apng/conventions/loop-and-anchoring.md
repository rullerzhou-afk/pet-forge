# 首尾帧关系与锚定策略

> APNG 路线最容易翻车的事：循环不无缝、过渡动画姿态对不上。
> 根本原因都是**没搞清楚这个状态的首尾帧关系**。
> 本文档来自 APNG 桌宠状态实战分类。

---

## 3 类首尾帧关系（一图读完）

```
┌─────────────────────────────────────────────────────────────┐
│  A. 循环动画 (loop: true)                                    │
│     首帧 ═══════════════════════════════════════════════ 尾帧 │
│              整个视频是闭环, 首=尾                           │
│     例: idle-dozing / typing / sleeping / working-* / mini-* │
│     gen-video: <动画名> --image X --last-frame X (同一张图) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  B. 一次性·回归型 (loop: false, anchor: same)               │
│     首帧 ─────[做完动作]─────[回到中性]──────────────── 尾帧 │
│              首=尾, 但中间经历了一段动作                     │
│     例: happy / notification / react-poke / idle-yawn / ...  │
│     gen-video: <动画名> --image X --last-frame X (同一张图) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  C. 一次性·过渡型 (loop: false, anchor: different)          │
│     首帧 X ───[过渡动作]──────────────────────────── 尾帧 Y │
│              首≠尾, 是状态间的"桥梁"                         │
│     例: wake (sleep→idle) / collapse-sleep (idle→sleep) /   │
│         mini-enter (offscreen→mini-idle)                     │
│     gen-video: <动画名> --image X --last-frame Y (不同两图) │
└─────────────────────────────────────────────────────────────┘
```

---

## 决策树：你的状态属于哪一类？

```
你要做的状态是什么？
   │
   ├─ 一直循环播放? (idle / typing / sleeping ...)
   │     │
   │     └─ A 类 (loop:true, 首=尾)
   │
   ├─ 触发一次?
   │     │
   │     ├─ 结束姿态是否等于开始姿态?
   │     │     │
   │     │     └─ B 类 (loop:false, 首=尾)
   │     │        例: happy / notification / react-poke / idle-yawn
   │     │
   │     └─ 结束姿态是否换成另一个状态姿态?
   │           │
   │           └─ C 类 (loop:false, 首≠尾, 是过渡)
   │              例: wake (sleep→idle) / collapse-sleep (idle→sleep)
   │
   └─ 它本质是状态间的过渡桥梁?
         │
         └─ C 类 (loop:false, 首≠尾)
```

**注意**：B 类和 C 类的差别看**首尾姿态是否相同**，不是看"最后状态名是不是 idle"：
- B 类 = 结尾回到开始姿态（例：happy 从 idle 起，庆祝完回 idle）
- C 类 = 结尾去另一个姿态（例：wake 从 sleep 起，结束到 idle；虽然目的地是 idle，但首≠尾）

复杂动作可以拆成多个 A / B / C 子段再组装；共享中间帧、正放/倒放和接缝验收见 [`segment-assembly.md`](segment-assembly.md)。

---

## 当前模板状态库的归类（25 个条目）

### A 类 · 循环（16 个）

| 状态 | duration | refKey | 备注 |
|---|---|---|---|
| `idle-dozing` | 5s | main | 极简微动只呼吸 |
| `idle-living` | 5s | main | 小动作循环（舔爪/整理） |
| `thinking` | 3s | main | 歪头+问号 |
| `working-typing` | 3s | main | 左右手交替 |
| `working-building` | 5s | building | 拿工具拧螺丝 |
| `working-juggling` | 5s | juggling | 玩抛接物 |
| `working-conducting` | 5s | main | 尾巴/触角作指挥棒 |
| `working-sweeping` | 5s | sweeping | 左右擦动 |
| `working-carrying` | 5s | carrying | 叼物左右走 |
| `react-drag` | 3s | react-drag | 悬浮兴奋飞 |
| `error` | 5s | error | XX眼侧躺呼吸 |
| `sleeping` | 5s | sleep-final | 睡觉呼吸+Zzz |
| `mini-idle` | 5s | mini | mini 模式呼吸 |
| `mini-alert` | 3s | mini | mini+感叹号 |
| `mini-happy` | 3s | mini | mini+花花星星 |
| `mini-sleep` | 5s | mini | mini 闭眼睡 |

### B 类 · 一次性·回归型（6 个）

| 状态 | duration | refKey | 备注 |
|---|---|---|---|
| `happy` | 4s | main | 庆祝完回 idle |
| `notification` | 2.5s | main | 警觉完回 idle |
| `react-poke` | 2.5s | main | 反应完回 idle |
| `idle-yawn` | 3s | main | 打完哈欠回 idle |
| `idle-look` | 6.5s | main | 张望完回正 |
| `mini-peek` | 2s | mini | mini 探头后回 mini-idle |

### C 类 · 一次性·过渡型（3 个）

| 状态 | duration | refKey (首) | lastKey (尾) | 备注 |
|---|---|---|---|---|
| `collapse-sleep` | 0.8s | main | sleep-final | idle → sleeping 过渡 |
| `wake` | 1.5s | sleep-final | main | sleeping → idle 过渡 |
| `mini-enter` | 3s | offscreen-left | mini | 场外 → mini-idle 过渡 |

### 常见衔接链

```
正常睡眠链:
  idle (A)
   → idle-yawn (B, 装饰)
   → idle-dozing (A, 等待)
   → collapse-sleep (C, 过渡到 sleeping)   ← 关键过渡
   → sleeping (A, 循环)
   → wake (C, 过渡回 idle)                  ← 关键过渡
   → idle (A)

mini 模式入场:
  idle (A)
   → mini-enter (C, 过渡到 mini-idle)       ← 关键过渡
   → mini-idle (A, 循环)
```

**关键认知**：C 类过渡是状态机的“桥梁”——缺少实际需要的过渡时，状态切换会“咔嚓”一下姿态突变。当前模板列出的数量只是示例，运行时应按真实状态图决定需要哪些过渡。

---

## gen-video.js 命令模板（按 anchor 类型）

### A / B 类（首=尾）

```powershell
node gen-video.js \
  idle-dozing \
  --image reference/main-ref.png \
  --last-frame reference/main-ref.png \
  --api doubao
```

`--last-frame` 跟 `--image` 用**同一张图**。

### C 类（首≠尾）

```powershell
# 例：collapse-sleep (idle 姿态 → sleeping 姿态)
node gen-video.js \
  collapse-sleep \
  --image reference/main-ref.png \
  --last-frame reference/sleep-final.png \
  --api doubao
```

`--last-frame` 用**不同的尾帧参考图**。

### 自动生成命令

`prompts/template.js` 提供了 `buildGenVideoCommand(key, refImagePaths)` 自动选 anchor 类型：

```javascript
import { buildGenVideoCommand } from './prompts/template.js';

const refImages = {
  main: 'reference/main-ref.png',
  'sleep-final': 'reference/sleep-final.png',
  // ...
};

console.log(buildGenVideoCommand('collapse-sleep', refImages));
// → 输出完整 gen-video.js 命令, 自动用 --last-frame sleep-final
```

---

## prompt 写法差异

### A 类（循环）的 prompt 必须强调

```
... Seamless loop animation — the last frame connects perfectly back to the first frame.
The body stays in place, only X moves.
```

### B 类（一次性·回归型）的 prompt 必须强调

```
... Then it settles back to the EXACT original pose / starting pose.
The ending pose must match the starting pose EXACTLY.
```

注意：B 类的**关键词不是 "Seamless loop"**，是 "settles back to original" / "returns to exact starting pose"。

### C 类（一次性·过渡型）的 prompt 必须强调

```
... End pose is the {sleeping ball / sitting upright / lying down}.
The end pose matches the {target state} pose EXACTLY.
```

C 类**绝对不写 "Seamless loop" 也不写 "returns to starting"**——它就是要去新姿态。

---

## 翻车案例

### 案例 1：循环动画（A 类）忘了 --last-frame，结果首尾对不齐

**症状**：working-typing 跑完 APNG 循环时"咔嚓"一下，前爪位置突变。

**原因**：只传了 `--image` 没传 `--last-frame`，AI 视频结尾自然结束在某个奇怪位置。

**修复**：补 `--last-frame <同 --image>`。

### 案例 2：B 类（回归型）prompt 写了 "Seamless loop"，结果 AI 把动作做成循环

**症状**：happy 庆祝动作循环了 4 次，看起来像 happy GIF。

**原因**：prompt 说 "Seamless loop"，AI 解读成"做循环"而不是"做一次"。

**修复**：B 类 prompt 改用 "Returns to exact starting pose at the end"，**不写 loop**。

### 案例 3：C 类（过渡型）忘了改 lastKey，用了同一张参考图

**症状**：collapse-sleep 跑完，角色坐下去...又站起来回 idle 姿态。AI 努力让首尾帧一致结果违反了"倒下入睡"的语义。

**原因**：`--last-frame` 用了 idle 参考图（跟 `--image` 同），AI 锚定要"结束在坐姿"。

**修复**：C 类必须用**不同的尾帧参考图**（sleep-final）。

### 案例 4：A 类不要描述"做几个动作循环"，AI 会真的做几次

**症状**：working-juggling 描述"bats the ball, falls back, hugs it, rolls back up..."，AI 把这一整套做了 2 次但首尾还是对不齐。

**原因**：prompt 描述了**多步动作序列**，AI 努力把整个序列塞进 5s。

**修复**：A 类的复杂动作 prompt 末尾**必须**强调 "...and returns to the EXACT starting pose"——告诉 AI 这一整套是循环的"一个周期"。

---

## SVG 路线对应（同样的 3 类）

虽然 SVG 路线不用 `--last-frame`，但 CSS keyframes 同样有这 3 类：

### A 类 → CSS infinite loop

```css
@keyframes typing {
  0%, 100% { /* 同一姿态, 闭环 */ }
  50%      { /* 中间姿态 */ }
}
.pet { animation: typing 3s infinite; }
```

`0%` 和 `100%` 必须**完全一致**（CSS 不会自动插值首尾，但下一轮循环开始时跳到 0%，所以 100% 和 0% 不一致 = 跳帧）。

### B 类 → CSS run once + reset

```css
@keyframes happy {
  0%   { /* 起始姿态 */ }
  50%  { /* 高潮 */ }
  100% { /* 回到起始姿态 (= 0%) */ }
}
.pet.happy {
  animation: happy 4s ease-out;
  animation-iteration-count: 1;
}
```

`0%` 和 `100%` 也相同，但只播一次。

### C 类 → CSS forwards (停在终态)

```css
@keyframes collapse-sleep {
  0%   { /* idle 姿态 */ }
  100% { /* sleeping 姿态 (≠ 0%) */ }
}
.pet.collapse-sleep {
  animation: collapse-sleep 0.8s ease-in forwards;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;  /* 关键: 停在 100% */
}
```

`forwards` 让 CSS 在动画结束后保持在 100% 姿态（去新状态），不回到 0%。

---

## 代表性的首尾关系验证案例

| 状态 | 类 | 翻车原因 |
|---|---|---|
| `working-typing` | A | 不写 "seamless loop" + 不传 --last-frame |
| `happy` | B | 写了 "seamless loop" 导致 AI 循环 / 不写 "returns to exact pose" |
| `collapse-sleep` | C | 没用不同的尾帧参考图 / prompt 说 "loop" |

这三项分别覆盖 A / B / C，适合用来检查工作流，但不是强制开工顺序。应按目标角色和真实运行时选择有代表性的状态；其他状态仍需分别验收，不能视为自动通过。
