[English README here](README.en.md)

# logseq-plugin-tocgen

生成任一页面/块的目录，通过它你可以快速访问页面/块内容。同时提供了滚动回页面顶部和底部的功能。注意目录是根据块层级来生成的。

## 功能展示

- 自动与内容同步
- Shift 点击可在侧边栏打开
- 多种展开收起方式
- 实时追踪编辑位置并在目录上高亮展示
- 嵌入块、嵌入页也能完美支持
- 可在目录上通过拖拽来管理文档结构
- 跟随主编辑页面变化的动态目录
- 可为动态目录固定高度，在这种情况下目录会跟随页面内容滚动

## 使用展示

场景一，动态目录

https://user-images.githubusercontent.com/3410293/196385678-ba12ad05-6729-4909-b527-83f5d062fd07.mp4

https://user-images.githubusercontent.com/3410293/213190318-93d60b93-c257-411e-aa84-9b93e3fe129d.mp4

场景二，页面内目录

![demo](demo_inline_toc.gif)

支持生成嵌入块/页面的目录

![demo](demo_embed.gif)

上面的演示用到了 [Another Embed](https://github.com/sethyuan/logseq-plugin-another-embed) 插件，推荐大家尝试。缩短 namespace 的效果的脚本是我写的 `custom.js` 的一部分，代码可在[这里](https://gist.github.com/sethyuan/4ea9ed4305d0145ad565b2128ae6cef4)获取。

## 使用示例

如果你想生成一个随当前浏览页面变动而变动的 TOC，你可以传`*`作为页面名。推荐。

```
{{renderer :tocgen2, *}}

指定目录高度，这样目录内容就会随页面内容滚动了。高度单位符合CSS规范。`auto` 代表不固定高度，高度取决于内容。
{{renderer :tocgen2, *, auto}}
{{renderer :tocgen2, *, 300px}}
```

```
为块所在的页面生成TOC。
{{renderer :tocgen2}}
{{renderer :tocgen2, [[]]}}

为某一页面创建一个TOC，可以用 "[[" 辅助查找想要的页面。
{{renderer :tocgen2, pagename}}
{{renderer :tocgen2, [[pagename]]}}

你也可以为某一页面块创建一个TOC，直接将块引用粘贴进来就好。
{{renderer :tocgen2, ((block-reference))}}

可以指定要生成几级。
{{renderer :tocgen2, [[]], auto, 2}}
{{renderer :tocgen2, [[pagename]], auto, 2}}
{{renderer :tocgen2, ((block-reference)), auto, 2}}

如果你想在TOC中只包含H1-Hn（h）这种heading，即markdown的`#`至`######`，或者指定任何内容都可以作为heading使用（any），那么你可以再通过一个参数来详细指定。
{{renderer :tocgen2, [[page name]], auto, 1, h}}
{{renderer :tocgen2, [[page name]], auto, 1, any}}
```

如果有某一块你不想列入 TOC 之中，那么你可以通过为其指定一个 `toc:: no` 块属性。

## 自定义样式

你可以通过以下几个 CSS 类来自定义样式，`kef-tocgen-page` 对应页面，`kef-tocgen-block` 对应块，`.kef-tocgen-active-block` 对应编辑中的块。参照 Logseq 自定义样式的文档操作，将内容放在`custom.css`中即可。

```css
.kef-tocgen-page {
  cursor: pointer;
  line-height: 2;
}
.kef-tocgen-block {
  line-height: 1.7;
}
.kef-tocgen-active-block {
  font-size: 1.1em;
  font-weight: 600;
}
```

你也可以通过`kef-tocgen-noactivepage`来自定义动态 TOC（见使用示例）在没有检测到活动页面时的内容与样式。

```css
.kef-tocgen-noactivepage::before {
  content: "🈚️";
}
```
