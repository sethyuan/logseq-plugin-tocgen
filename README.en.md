[中文](README.md) | English

# logseq-plugin-tocgen

Generate a TOC of any page/block and quickly access the page/block's content. Buttons that go to top and bottom are also provided. Notice that the TOC is generated based on block levels.

## Feature Highlights

- Sync with content automatically
- Shift click to open in the sidebar
- Multiple ways to expand and collapse
- Alt+Click to expand/collapse all descendants
- Realtime tracking and highlighting of the current editing position in TOC
- Embedded blocks and pages are supported
- Drag and drop in TOC to organize the document structure
- Dynamic TOC that follows the main page being edited
- Fixed height TOC that scrolls in sync with the content
- Quickly open an TOC to the right sidebar through the toolbar or the page's context menu
- A "back to top" and "go down" button for easier jumping (optional)
- Automatically go to the top when switching pages (optional)

For details please go to the plugins settings.

## Usage

### Scenario 0, context menu

![image](https://user-images.githubusercontent.com/3410293/230697775-bcca87fd-64a3-4c5c-9fc0-5f166fcedf59.png)

https://user-images.githubusercontent.com/3410293/216609543-9edcf0de-6a87-441a-a599-0b50511bb713.mp4

### Scenario 1, dynamic TOC

https://user-images.githubusercontent.com/3410293/196385678-ba12ad05-6729-4909-b527-83f5d062fd07.mp4

### Scenario 2, inline TOC

![demo](demo_inline_toc.gif)

### Support generating TOC entries for embedded blocks/pages

![demo](demo_embed.gif)

The demo above used the plugin [Another Embed](https://github.com/sethyuan/logseq-plugin-another-embed), you're welcome to try it. The namespace collapsing behavior is part of my `custom.js`, you can find the code [here](https://gist.github.com/sethyuan/4ea9ed4305d0145ad565b2128ae6cef4).

## Examples

If you want to generate a TOC that dynamically changes according to what page you're currently working on, you can use `*` as page name. Recommended.

```
{{renderer :tocgen2, *}}

Specify a height for the TOC and its content will scroll in sync with the page content. CSS height units are accepted. `auto` means height is dependant on content.
{{renderer :tocgen2, *, auto}}
{{renderer :tocgen2, *, 300px}}
```

```
Generate a TOC for the page where block belongs to.
{{renderer :tocgen2}}
{{renderer :tocgen2, [[]]}}

Create a TOC for a page, you can use "[[" to help find the page.
{{renderer :tocgen2, pagename}}
{{renderer :tocgen2, [[pagename]]}}

You can also create a TOC for a block, just paste its reference in.
{{renderer :tocgen2, ((block-reference))}}

You can specify how many levels to generate.
{{renderer :tocgen2, [[]], auto, 2}}
{{renderer :tocgen2, [[pagename]], auto, 2}}
{{renderer :tocgen2, ((block-reference)), auto, 2}}

If you want to include only H1-Hn headings (h), that is, `#` to `######` in markdown,
or if you want any content be treated like a heading (any),
you need to use a third argument.
{{renderer :tocgen2, [[page name]], auto, 1, h}}
{{renderer :tocgen2, [[page name]], auto, 1, any}}
```

If there is a block that you don't want it to appear in TOC, you can give it a `toc:: no` block property.

## Style Customization

You can customize styles using the following CSS classes, `kef-tocgen-page` for page, `kef-tocgen-block` for block, `.kef-tocgen-active-block` for active block. Refer to Logseq's document for how to customize styles, place your modifications in `custom.css`.

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

You can also use `kef-tocgen-noactivepage` to customize dynamic TOC's (see Examples section above) content and style when no active page is detected.

```css
.kef-tocgen-noactivepage::before {
  content: "🈚️";
}
```

## Buy me a coffee

If you think the software I have developed is helpful to you and would like to give recognition and support, you may buy me a coffee using following link. Thank you for your support and attention.

<a href="https://www.buymeacoffee.com/sethyuan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
