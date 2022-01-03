import "@logseq/libs"
import { render } from "preact"
import ConfigProvider from "./comps/ConfigProvider.jsx"
import TocGen from "./comps/TocGen.jsx"
import { HeadingTypes } from "./utils.js"

const observers = {}

async function main() {
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

  logseq.App.onMacroRendererSlotted(tocRenderer)

  logseq.Editor.registerSlashCommand("Table of Contents", async () => {
    await logseq.Editor.insertAtEditingCursor("{{renderer :tocgen, }}")
    const input = parent.document.activeElement
    const pos = input.selectionStart - 2
    input.setSelectionRange(pos, pos)
  })

  logseq.beforeunload(() => {
    for (const observer of Object.values(observers)) {
      observer?.disconnect()
    }
  })

  console.log("#tocgen loaded")
}

async function tocRenderer({ slot, payload: { arguments: args, uuid } }) {
  const [type] = args
  if (type !== ":tocgen") return

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const nameArg = !args[1] || args[1] === "$1" ? "" : args[1].trim()
  const isBlock = nameArg?.startsWith("((")
  const name = isBlock
    ? nameArg?.replace(/^\(\((.+)\)\)\s*$/, "$1")
    : nameArg?.replace(/^\[\[(.+)\]\]\s*$/, "$1")
  const levels =
    !args[2] || args[2] === "$2"
      ? logseq.settings?.defaultLevels ?? 1
      : Math.max(1, +args[2] || 1)
  const headingType =
    !args[3] || args[3] === "$3"
      ? logseq.settings?.defaultHeadingType ?? "any"
      : args[3].trim()
  const id = `kef-toc-${name.replace(
    "/",
    "_",
  )}-${levels}-${headingType}-${uuid}`

  if (!name) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "缺少页面/块名！" : "Missing page/block name!"
      }]</div>`,
    })
    return
  }
  if (HeadingTypes[headingType] == null) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN"
          ? "标题类型需为 any 或 h！"
          : 'Heading type must be "any" or "h"!'
      }]</div>`,
    })
    return
  }

  const root = isBlock
    ? await logseq.Editor.getBlock(name, { includeChildren: true })
    : await logseq.Editor.getPage(name)

  if (root == null) {
    logseq.provideUI({
      key: id,
      slot,
      template: `<div id="${id}" style="color:#f00">[${
        lang === "zh-CN" ? "页面/块不存在！" : "Page/Block not found!"
      }]</div>`,
    })
    return
  }

  logseq.provideUI({
    key: id,
    slot,
    template: `<div id="${id}"></div>`,
  })

  // Let div root element get generated first.
  setTimeout(() => observeAndGenerate(id, root, levels, headingType, lang), 0)
}

async function observeAndGenerate(id, root, levels, headingType, lang) {
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
        <TocGen
          root={root}
          blocks={blocks}
          levels={levels}
          headingType={headingType}
        />
      </ConfigProvider>,
      rootEl,
    )
    return true
  }

  if (observers[id] == null) {
    const observer = new MutationObserver(async (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.removedNodes.length > 0 && !rootEl.isConnected) {
          observer.disconnect()
          observers[id] = undefined
          return
        }

        for (const node of mutation.addedNodes) {
          if (await renderIfPageBlock(node)) return
        }
      }
    })
    observers[id] = observer

    observer.observe(parent.document.body, {
      subtree: true,
      childList: true,
    })
  }

  const blocks =
    root.page == null
      ? await logseq.Editor.getPageBlocksTree(root.name)
      : root.children

  render(
    <ConfigProvider lang={lang}>
      <TocGen
        root={root}
        blocks={blocks}
        levels={levels}
        headingType={headingType}
      />
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
