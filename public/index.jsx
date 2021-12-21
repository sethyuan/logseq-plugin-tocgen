import "@logseq/libs"
import { render } from "preact"
import ConfigProvider from "./comps/ConfigProvider.jsx"
import TocGen from "./comps/TocGen.jsx"

async function main() {
  logseq.App.onMacroRendererSlotted(tocRenderer)

  logseq.provideStyle(`
    .kef-tocgen-page {
      cursor: pointer;
      line-height: 2;
    }
    .kef-tocgen-page:hover {
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-block {
      line-height: 1.7;
    }
    .kef-tocgen-block-children {
      margin-left: 20px;
    }
    .kef-tocgen-into {
      cursor: pointer;
    }
    .kef-tocgen-into:hover {
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-to {
      font-size: 0.8em;
      margin-left: 6px;
      color: var(--ls-icon-color);
    }
    .kef-tocgen-to:hover {
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-arrow {
      padding-right: 4px;
      margin-right: 3px;
    }
  `)

  console.log("#tocgen loaded")
}

async function tocRenderer({ slot, payload: { arguments: args } }) {
  const [type, pageName] = args

  if (type !== ":tocgen") return

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const levels =
    !args[2] || args[2] === "$2"
      ? logseq.settings?.defaultLevels ?? 1
      : +args[2]
  const id = `kef-toc-${Date.now()}-${slot}`

  if (!pageName) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "缺少页面名！" : "Missing page name!"
      }]</div>`,
      reset: true,
    })
    return
  }

  const page = await logseq.Editor.getPage(
    pageName.replace(/^\[\[(.+)\]\]\s*$/, "$1"),
  )

  if (page == null) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "页面不存在！" : "Page not found!"
      }]</div>`,
      reset: true,
    })
    return
  }

  logseq.provideUI({
    key: id,
    slot,
    template: `<div id="${id}"></div>`,
    reset: true,
  })

  // Let div root element get generated first.
  setTimeout(() => observeAndGenerate(id, page, levels, lang), 0)
}

async function observeAndGenerate(id, page, levels, lang) {
  const root = parent.document.getElementById(id)

  async function renderIfPageBlock(node) {
    const blockEl = getBlockEl(node)
    if (blockEl == null) return false

    const blockID = blockEl.getAttribute("blockid")
    const block = await logseq.Editor.getBlock(blockID)
    if (block?.page.id !== page.id) return false

    const blocks = await logseq.Editor.getPageBlocksTree(page.name)
    render(
      <ConfigProvider lang={lang}>
        <TocGen page={page} blocks={blocks} levels={levels} />
      </ConfigProvider>,
      root,
    )
    return true
  }

  const observer = new MutationObserver(async (mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.removedNodes.length > 0 && !root.isConnected) {
        observer.disconnect()
        return
      }

      for (const node of mutation.addedNodes) {
        if (await renderIfPageBlock(node)) return
      }
    }
  })

  observer.observe(parent.document.body, {
    subtree: true,
    childList: true,
  })

  const blocks = await logseq.Editor.getPageBlocksTree(page.name)
  render(
    <ConfigProvider lang={lang}>
      <TocGen page={page} blocks={blocks} levels={levels} />
    </ConfigProvider>,
    root,
  )
}

function getBlockEl(node) {
  const body = document.body
  while (
    node != null &&
    (node.getAttribute?.("blockid") == null ||
      node.getAttribute?.("level") == null) &&
    node !== body
  ) {
    node = node.parentElement
  }
  return node === body ? null : node
}

logseq.ready(main).catch(console.error)
