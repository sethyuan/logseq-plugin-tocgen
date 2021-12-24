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
  const [type, name] = args

  if (type !== ":tocgen") return

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const levels =
    !args[2] || args[2] === "$2"
      ? logseq.settings?.defaultLevels ?? 1
      : +args[2]
  const id = `kef-toc-${Date.now()}-${slot}`

  if (!name) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "缺少页面/块名！" : "Missing page/block name!"
      }]</div>`,
      reset: true,
    })
    return
  }

  const root = name.startsWith("((")
    ? await logseq.Editor.getBlock(name.replace(/^\(\((.+)\)\)\s*$/, "$1"), {
        includeChildren: true,
      })
    : await logseq.Editor.getPage(name.replace(/^\[\[(.+)\]\]\s*$/, "$1"))

  if (root == null) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "页面/块不存在！" : "Page/Block not found!"
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
  setTimeout(() => observeAndGenerate(id, root, levels, lang), 0)
}

async function observeAndGenerate(id, root, levels, lang) {
  const rootEl = parent.document.getElementById(id)

  async function renderIfPageBlock(node) {
    const blockEl = getBlockEl(node)
    if (blockEl == null) return false

    const blockID = blockEl.getAttribute("blockid")
    let block = await logseq.Editor.getBlock(blockID)
    if (block == null) return false
    if (root.page == null && block.page.id !== root.id) return false
    if (root.page != null) {
      // Keep checking parent until root is found or no more parent.
      while (block != null) {
        if (block.parent.id === root.id) break
        block = await logseq.Editor.getBlock(block.parent.id)
      }
      if (block == null) return false
    }

    const blocks =
      root.page == null
        ? await logseq.Editor.getPageBlocksTree(root.name)
        : (await logseq.Editor.getBlock(root.id, { includeChildren: true }))
            .children
    render(
      <ConfigProvider lang={lang}>
        <TocGen root={root} blocks={blocks} levels={levels} />
      </ConfigProvider>,
      rootEl,
    )
    return true
  }

  const observer = new MutationObserver(async (mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.removedNodes.length > 0 && !rootEl.isConnected) {
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

  logseq.beforeunload(() => {
    observer.disconnect()
  })

  const blocks =
    root.page == null
      ? await logseq.Editor.getPageBlocksTree(root.name)
      : root.children
  render(
    <ConfigProvider lang={lang}>
      <TocGen root={root} blocks={blocks} levels={levels} />
    </ConfigProvider>,
    rootEl,
  )
}

function getBlockEl(node) {
  const body = document.body
  while (
    node != null &&
    node.getAttribute?.("blockid") == null &&
    node !== body
  ) {
    node = node.parentElement
  }
  return node === body ? null : node
}

logseq.ready(main).catch(console.error)
