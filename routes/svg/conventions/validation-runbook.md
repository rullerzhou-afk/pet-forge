# SVG 验证 runbook

> 静帧截图不算验收。SVG 桌宠至少要过结构、脚本、嵌入、循环和目标端验证。

## 1. 结构先过

先确认文件能被解析：

- 裸 `.svg`：用 XML/SVG parser 检查标签闭合、命名空间、重复 `id`；
- `.svg.html`：用浏览器或 HTML parser 打开，确认 DOM 里存在目标 `<svg>`；
- 所有可动画部件有稳定 `id`；
- `viewBox` 能完整容纳动作幅度。

如果结构都不稳，不要先调动画。

## 2. 自包含检查

交付状态应该能独立运行。检查这些风险：

- 外部 `<script src>` / `<link rel="stylesheet">`；
- 跨文件 `<use href="other.svg#part">`；
- 必须联网才能加载的 image/font；
- runtime 不提供时会失败的 `fetch()`；
- 只在本机绝对路径存在的资源。

开发期 tuner 可以有外部依赖；canonical state 不可以。

## 3. 脚本可解析

含脚本的状态先做最小脚本检查：

- 浏览器 console 无 syntax error；
- 初始化函数可重复执行或有明确 guard；
- 没有未捕获 promise rejection；
- host bridge 缺失时能降级到默认动画；
- duration/readiness probe 返回稳定值。

这一步只证明“脚本能跑”，不证明“动画好看”。

## 4. 选择正确预览入口

不同文件形态用不同入口：

- `.svg.html`：直接用浏览器或 runtime 加载；
- 纯 `.svg`：可直接打开，但脚本、外链和安全策略可能和 runtime 不同；
- scripted SVG：用 `<object>`、iframe/webview 或内联预览壳验证；
- 需要本地资源的草稿：起一个本地静态 server，不要依赖 `file://` 行为。

如果直开文件和 runtime 表现不同，以 runtime 或与 runtime 等价的嵌入方式为准。

## 5. 循环看 30 秒以上

播放时至少检查：

- 0% / 100% 是否完全闭环；
- 长周期元素是否越漂越远；
- blink、breath、secondary motion 是否全部同步抽搐；
- pointer-look 等脚本动画是否抖动；
- 关键识别部件是否被裁切、遮挡或滤镜污染。

单帧好看只能说明造型可用，不能说明状态可交付。

## 6. 目标端复验

最后在用户实际会看到的目标里复验：

- runtime 映射是否指向正确文件；
- showcase / demo 是否引用 canonical state；
- HTTP 服务时 content type 是否合理；
- preview URL 和 production URL 是否为同一版本；
- 目标浏览器或 WebView 是否有 filter、mask、image 栅格化差异。

问题出现时先分层：源文件、嵌入方式、runtime 映射、部署缓存、目标端渲染。不要把所有现象都归因到动画本身。
