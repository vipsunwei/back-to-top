# back-to-top

给任意网页加一个带滚动进度环的悬浮「回到顶部」按钮，向下滚动超过 300px 后自动出现。

## 特性

- 进度环实时反映当前滚动进度
- 兼容 SPA 站点（YouTube 等靠内部容器滚动的页面）
- 尊重 `prefers-reduced-motion`，系统设置中途改变也会实时跟随
- 无依赖、`@grant none`，不申请任何油猴特权
- 按钮被页面脚本删除、或其内容被清空后，自动重建
- 样式优先走 adoptedStyleSheets，现代浏览器下不受页面 CSP 限制
- 隐藏状态下不参与键盘 Tab 顺序

## 兼容性

样式优先用构造式样式表（Chrome 73+ / Safari 16.4+），它不受页面 `style-src` 限制，也不随 DOM 节点被删；不支持的环境自动退回注入 `<style>`，此时若站点 CSP 禁行内样式，按钮不会出现（宁可不显示一个无样式的按钮）。

## 安装

1. 安装脚本管理器：Tampermonkey / Violentmonkey
2. 在 GreasyFork 搜索「回到顶部 · 进度环按钮」安装，或把 `back-to-top.user.js` 拖进管理器
3. 打开任意网页向下滚动，按钮出现后点击即可回到顶部

## 设计说明

点击时滚动「最后触发滚动的容器」回顶部，而不是固定滚页面。这样在 SPA 和内部滚动区域上同样有效，点击必有可见效果。

## 更新日志

### 1.6.0

- 自愈修复：`MutationObserver` 改为观察 `documentElement` 的直接子节点，与按钮的实际父节点对齐，删除按钮真正能触发重建；触发面从「整页 body 抖动」收窄到「head/body/按钮增删」
- 完整性判据下沉到 `ensure()`，并用缓存引用 `isConnected` 做哨兵挂进绘制路径，覆盖「按钮被清空 innerHTML」这种观察者看不到的损坏；`ensure()` 不再回调 `update()`，无互递归
- 样式改用 `adoptedStyleSheets`（不支持时自动退回 `<style>`），修复严格 CSP 站点整张样式表被拦的问题；两条路径都会自愈，且被页面整体重赋 `adoptedStyleSheets` 后能重新挂回；旧浏览器退回 `<style>` 时若 CSP 拦截，按钮不会出现而非显示裸按钮
- 隐藏态改用 `visibility`，按钮不再参与 Tab 顺序（`visibility` 追加进原 transition 列表，保留 hover 过渡）
- 所有 DOM id 与 class 换用 `btp-vs-` 前缀，并给自有节点打 `data-btp-vs` 归属标记，撞到页面同名 id 时不会误删对方节点
- `prefers-reduced-motion` 改为监听 `change`，系统设置中途变化即时生效
- `scrollTo` 失败时兜底 `scrollTop = 0`
- 删除 `waitForBody` 轮询与 `readyState === 'loading'` 分支，改为两行启动判断（不再依赖 `@run-at document-idle` 一定被脚本管理器兑现）
- `resize` / `popstate` / `hashchange` 统一走 rAF 节流

### 1.5.2

- 脚本头增加 `@license MIT` 声明

### 1.5.1

- 添加 MIT 许可证

### 1.5.0

- 清理调试代码与死分支
- 合并回顶逻辑，去掉冗余分支

## License

MIT，详见 [LICENSE](LICENSE)。
