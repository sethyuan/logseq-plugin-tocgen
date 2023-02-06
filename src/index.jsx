import "@logseq/libs"
import { waitMs } from "jsutils"
import { setup, t } from "logseq-l10n"
import { render } from "preact"
import { debounce } from "rambdax"
import TocGen from "./comps/TocGen.jsx"
import {
  EMBED_REGEX,
  HeadingTypes,
  isHeading,
  waitForEl,
} from "./libs/utils.js"
import zhCN from "./translations/zh-CN.json"

const TB_ICON = `<svg t="1675661268312" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1525" width="200" height="200"><path d="M128 384l597.333333 0 0-85.333333-597.333333 0 0 85.333333zM128 554.666667l597.333333 0 0-85.333333-597.333333 0 0 85.333333zM128 725.333333l597.333333 0 0-85.333333-597.333333 0 0 85.333333zM810.666667 725.333333l85.333333 0 0-85.333333-85.333333 0 0 85.333333zM810.666667 298.666667l0 85.333333 85.333333 0 0-85.333333-85.333333 0zM810.666667 554.666667l85.333333 0 0-85.333333-85.333333 0 0 85.333333z" p-id="1526"></path></svg>`
const BACK_TOP_ICON = `<svg t="1641276288794" class="kef-tocgen-icon-backtop" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4076" width="200" height="200"><path d="M526.848 202.24c-4.096-4.096-9.216-6.144-14.848-6.144s-11.264 2.048-14.848 6.144L342.016 356.864c-8.192 8.192-8.192 21.504 0 30.208 8.192 8.192 21.504 8.192 30.208 0L512 247.296l139.776 139.776c4.096 4.096 9.728 6.144 14.848 6.144 5.632 0 10.752-2.048 14.848-6.144 8.192-8.192 8.192-21.504 0-30.208L526.848 202.24zM116.224 595.968h90.624v231.936h42.496V595.968h90.624v-42.496H115.712v42.496z m458.24-42.496h-112.64c-13.824 0-27.136 5.12-37.376 15.36s-15.36 24.064-15.36 37.376v168.448c0 13.824 5.12 27.136 15.36 37.376s24.064 15.36 37.376 15.36h112.64c13.824 0 27.136-5.12 37.376-15.36s15.36-24.064 15.36-37.376V606.208c0-13.824-5.12-27.136-15.36-37.376s-23.552-15.36-37.376-15.36z m10.752 221.696c0 2.048-0.512 5.12-3.072 7.68s-5.632 3.072-7.68 3.072h-112.64c-2.048 0-5.12-0.512-7.68-3.072s-3.072-5.632-3.072-7.68V606.72c0-2.048 0.512-5.12 3.072-7.68s5.632-3.072 7.68-3.072h112.64c2.048 0 5.12 0.512 7.68 3.072s3.072 5.632 3.072 7.68v168.448z m307.2-205.824c-10.24-10.24-24.064-15.36-37.376-15.36H709.632v274.432h42.496v-120.32H855.04c13.824 0 27.136-5.12 37.376-15.36s15.36-24.064 15.36-37.376v-48.128c0-14.336-5.12-27.648-15.36-37.888z m-27.136 84.992c0 2.048-0.512 5.12-3.072 7.68s-5.632 3.072-7.68 3.072H751.104v-69.12H855.04c2.048 0 5.12 0.512 7.68 3.072s3.072 5.632 3.072 7.68v47.616h-0.512z" p-id="4077"></path></svg>`
const GO_DOWN_ICON = `<svg t="1651059361900" class="kef-tocgen-icon-godown" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12219" width="200" height="200"><path d="M830.24 340.688l11.328 11.312a16 16 0 0 1 0 22.624L530.448 685.76a16 16 0 0 1-22.64 0L196.688 374.624a16 16 0 0 1 0-22.624l11.312-11.312a16 16 0 0 1 22.624 0l288.496 288.496 288.512-288.496a16 16 0 0 1 22.624 0z" p-id="12220"></path></svg>`
const ICON_TRANSITION_DURATION = 200
const CURRENT = "*"
const SIDEBAR_CONTENTS_SELECTOR = ".sidebar-item #contents"

const macroObservers = {}
const intersectionObservers = {}
const routeOffHooks = {}
let resizeObserver = null
// A map of all roots to observe to for a given slot.
const embedRoots = {}

const backtopScrollHandler = debounce((e) => {
  const scrollTop = e.target.scrollTop
  const backtop = parent.document.querySelector(".kef-tocgen-backtop")
  if (scrollTop >= 300) {
    if (backtop.style.display !== "block") {
      backtop.style.display = "block"
      requestAnimationFrame(() => {
        backtop.style.opacity = 0.7
      })
    }
  } else {
    if (backtop.style.display === "block") {
      backtop.style.opacity = 0
      setTimeout(() => {
        backtop.style.display = ""
      }, ICON_TRANSITION_DURATION)
    }
  }
}, 50)

const godownScrollHandler = debounce((e) => {
  const scrollHeight = e.target.scrollHeight
  const scrollTop = e.target.scrollTop
  const godown = parent.document.querySelector(".kef-tocgen-godown")
  if (scrollTop + e.target.clientHeight + 300 <= scrollHeight) {
    if (godown.style.display !== "block") {
      godown.style.display = "block"
      requestAnimationFrame(() => {
        godown.style.opacity = 0.7
      })
    }
  } else {
    if (godown.style.display === "block") {
      godown.style.opacity = 0
      setTimeout(() => {
        godown.style.display = ""
      }, ICON_TRANSITION_DURATION)
    }
  }
}, 50)

async function main() {
  await setup({ builtinTranslations: { "zh-CN": zhCN } })

  logseq.provideStyle(`
    .kef-tocgen-dragging .kef-tocgen-block-container * {
      pointer-events: none;
    }
    .kef-tocgen-page {
      line-height: 2;
      display: flex;
      align-items: flex-start;
    }
    .kef-tocgen-page:hover > div > .inline {
      cursor: pointer;
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-block-children {
      margin-left: 14px;
      position: relative;
    }
    .kef-tocgen-block-collapse {
      z-index: 1;
      position: absolute;
      top: 5px;
      left: -10px;
      width: 4px;
      height: calc(100% - 10px);
      border-left: 1px solid var(--ls-guideline-color);
      cursor: pointer;
    }
    .kef-tocgen-block-collapse:hover {
      border-left: 2px solid var(--ls-primary-text-color);
      left: -10px;
      border-radius: 2px;
    }
    .kef-tocgen-block {
      display: flex;
      align-items: flex-start;
      pointer-events: auto !important;
      border-top: 2px solid transparent;
      margin-bottom: -2px;
    }
    .kef-tocgen-active-block {
      color: var(--ls-link-text-color);
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
      vertical-align: middle;
    }
    .kef-tocgen-to:hover {
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-arrow {
      padding-right: 4px;
      margin-right: 3px;
    }
    .kef-tocgen-arrow:hover {
      color: var(--ls-link-ref-text-color);
    }
    .kef-tocgen-arrow-hidden {
      visibility: hidden;
    }
    .kef-tocgen-noactivepage::before {
      content: "${t("No active page")}";
    }
    .kef-tocgen-icon-expand {
      width: 1em;
      height: 1em;
      transform: translateY(-1px);
    }
    .kef-tocgen-icon-edit {
      width: 0.9em;
      height: 0.9em;
      transform: translateY(-1px);
      margin-left: 2px;
    }
    .kef-tocgen-drag-childholder {
      pointer-events: auto !important;
      height: 0;
      border-top: 2px solid transparent;
      padding-bottom: 1px;
      margin-left: 19px;
    }
    .kef-tocgen-drag-bottomholder {
      pointer-events: auto !important;
      height: 0;
      border-top: 2px solid transparent;
    }

    .kef-tocgen-backtop {
      position: fixed;
      left: 0;
      bottom: 95px;
      will-change: transform;
      background: var(--ls-secondary-background-color);
      border-radius: 50%;
      display: none;
      opacity: 0;
      transition: opacity ${ICON_TRANSITION_DURATION}ms ease-in-out;
      z-index: var(--ls-z-index-level-1);
    }
    .kef-tocgen-backtop:hover {
      opacity: 1 !important;
      box-shadow: 0px 2px 4px 0px #ccc;
    }
    .kef-tocgen-icon-backtop {
      width: 35px;
      height: 35px;
      fill: var(--ls-primary-text-color);
      padding: 4px;
    }
    .kef-tocgen-godown {
      position: fixed;
      left: 0;
      bottom: 55px;
      will-change: transform;
      background: var(--ls-secondary-background-color);
      border-radius: 50%;
      display: none;
      opacity: 0;
      transition: opacity ${ICON_TRANSITION_DURATION}ms ease-in-out;
      z-index: var(--ls-z-index-level-1);
    }
    .kef-tocgen-godown:hover {
      opacity: 1 !important;
      box-shadow: 0px 2px 4px 0px #ccc;
    }
    .kef-tocgen-icon-godown {
      width: 35px;
      height: 35px;
      fill: var(--ls-primary-text-color);
      padding: 4px;
    }

    .kef-tocgen-tb-icon {
      display: flex;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      justify-content: center;
      align-items: center;
      color: var(--ls-header-button-background);
    }
    .kef-tocgen-tb-icon svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }
    .kef-tocgen-tb-icon:hover {
      background: var(--ls-tertiary-background-color);
    }
  `)

  logseq.App.onMacroRendererSlotted(tocRenderer)

  logseq.Editor.registerSlashCommand("Table of Contents", async () => {
    await logseq.Editor.insertAtEditingCursor("{{renderer :tocgen2}}")
    // NOTE: Leave this cursor moving code for future reference.
    // const input = parent.document.activeElement
    // const pos = input.selectionStart - 2
    // input.setSelectionRange(pos, pos)
  })

  logseq.App.registerPageMenuItem(t("Open TOC"), async ({ page }) =>
    openPageTOC(page),
  )
  logseq.App.registerUIItem("toolbar", {
    key: t("open-toc"),
    template: `<a class="kef-tocgen-tb-icon" data-on-click="openTOC" title="${t(
      "Open TOC",
    )}">${TB_ICON}</a>`,
  })

  const mainContainer = parent.document.getElementById("main-container")
  const mainContentContainer = parent.document.getElementById(
    "main-content-container",
  )

  if (!logseq.settings?.hideBackTop) {
    logseq.provideUI({
      key: "kef-tocgen-backtop",
      path: "#app-container",
      template: `<a title="${t(
        "Back to Top",
      )}" class="kef-tocgen-backtop" data-on-click="backtop">${BACK_TOP_ICON}</a>`,
    })

    // Let backtop element get generated first.
    setTimeout(() => {
      const backtop = parent.document.querySelector(".kef-tocgen-backtop")
      const contentEl = parent.document.querySelector(
        ".cp__sidebar-main-content > div:first-child",
      )
      if (contentEl) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            const contentElRect = contentEl.getBoundingClientRect()
            const mainContentContainerRect =
              mainContentContainer.getBoundingClientRect()
            backtop.style.transform = `translateX(${
              contentElRect.right + 57 < mainContentContainerRect.right
                ? contentElRect.right + 20
                : mainContentContainerRect.right - 57
            }px)`
          })
        })
        resizeObserver.observe(mainContentContainer)
        resizeObserver.observe(contentEl)
      }
      mainContentContainer.addEventListener("scroll", backtopScrollHandler)
    }, 0)
  }

  if (!logseq.settings?.hideGoDown) {
    logseq.provideUI({
      key: "kef-tocgen-godown",
      path: "#app-container",
      template: `<a title="${t(
        "Go Down",
      )}" class="kef-tocgen-godown" data-on-click="godown">${GO_DOWN_ICON}</a>`,
    })

    // Let godown element get generated first.
    setTimeout(() => {
      const godown = parent.document.querySelector(".kef-tocgen-godown")
      const contentEl = parent.document.querySelector(
        ".cp__sidebar-main-content > div:first-child",
      )
      if (contentEl) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => {
            const contentElRect = contentEl.getBoundingClientRect()
            const mainContentContainerRect =
              mainContentContainer.getBoundingClientRect()
            godown.style.transform = `translateX(${
              contentElRect.right + 57 < mainContentContainerRect.right
                ? contentElRect.right + 20
                : mainContentContainerRect.right - 57
            }px)`
          })
        })
        resizeObserver.observe(mainContentContainer)
        resizeObserver.observe(contentEl)
      }
      mainContentContainer.addEventListener("scroll", godownScrollHandler)
    }, 0)
  }

  logseq.beforeunload(() => {
    for (const off of Object.values(routeOffHooks)) {
      off?.()
    }
    for (const observer of Object.values(macroObservers)) {
      observer?.disconnect()
    }
    for (const observer of Object.values(intersectionObservers)) {
      observer?.disconnect()
    }

    mainContentContainer.removeEventListener("scroll", backtopScrollHandler)
    mainContentContainer.removeEventListener("scroll", godownScrollHandler)

    resizeObserver?.disconnect()
  })

  logseq.useSettingsSchema([
    {
      key: "defaultLevels",
      type: "number",
      default: 6,
      description: t(
        "It defines how many levels a TOC contains by default if not specified when the TOC is created.",
      ),
    },
    {
      key: "defaultExpansionLevel",
      type: "number",
      default: 1,
      description: t(
        "It defines to which level the TOC is expanded to by default.",
      ),
    },
    {
      key: "defaultHeadingType",
      type: "enum",
      enumChoices: ["any", "h"],
      enumPicker: "select",
      default: "h",
      description: t(
        'It defines what kind of blocks can be recognized as a heading. "any" means that any block will do；"h" means that only H1-Hn blocks are accepted as headings.',
      ),
    },
    {
      key: "showTags",
      type: "boolean",
      default: false,
      description: t("It defines whether or not to show tags in TOC."),
    },
    {
      key: "hideBackTop",
      type: "boolean",
      default: false,
      description: t(
        'You can use this setting to disable the "Back to Top" functionality.',
      ),
    },
    {
      key: "hideGoDown",
      type: "boolean",
      default: false,
      description: t(
        'You can use this setting to disable the "Go Down" functionality.',
      ),
    },
    {
      key: "noPageJump",
      type: "boolean",
      default: false,
      description: t(
        'Set this to true and you will not see the "page" link in TOC.',
      ),
    },
  ])

  console.log("#tocgen loaded")
}

async function tocRenderer({ slot, payload: { arguments: args, uuid } }) {
  const type = args[0]?.trim()
  if (type !== ":tocgen" && type !== ":tocgen2") return

  const slotEl = parent.document.getElementById(slot)
  if (!slotEl) return
  const renderered = slotEl.childElementCount > 0
  if (renderered) return

  const nameArg = !args[1] ? "" : args[1].trim()
  const isBlock = nameArg?.startsWith("((")
  const name =
    nameArg === CURRENT
      ? await getCurrentPageName()
      : (isBlock
          ? nameArg?.replace(/^\(\((.*)\)\)\s*$/, "$1")
          : nameArg?.replace(/^\[\[(.*)\]\]\s*$/, "$1")) ||
        (
          await logseq.Editor.getPage(
            (
              await logseq.Editor.getBlock(uuid)
            ).page.id,
          )
        ).name
  const trimmedHeight = args[2]?.trim()
  const height =
    type === ":tocgen"
      ? null
      : !trimmedHeight || trimmedHeight === "auto"
      ? null
      : trimmedHeight
  const levelsIndex = type === ":tocgen" ? 2 : 3
  const levels = !args[levelsIndex]
    ? logseq.settings?.defaultLevels ?? 6
    : Math.max(1, +args[levelsIndex] || 1)
  const headingTypeIndex = type === ":tocgen" ? 3 : 4
  const headingType = !args[headingTypeIndex]
    ? logseq.settings?.defaultHeadingType ?? "h"
    : args[headingTypeIndex].trim()
  const id = `kef-toc-${slot}`

  if (HeadingTypes[headingType] == null) {
    logseq.provideUI({
      key: `error-${slot}`,
      slot,
      template: `<div id="${id}" style="color:#f00">[${t(
        'Heading type must be "any" or "h"!',
      )}]</div>`,
      reset: true,
    })
    return
  }

  slotEl.style.width = "100%"

  const root =
    name == null
      ? null
      : isBlock
      ? await logseq.Editor.getBlock(name)
      : await logseq.Editor.getPage(name)

  if (name != null && root == null) {
    logseq.provideUI({
      key: `error-${slot}`,
      slot,
      template: `<div id="${id}" style="color:#f00">[${t(
        "Page/Block not found!",
      )}]</div>`,
      reset: true,
    })
    return
  }

  logseq.provideUI({
    key: `toc-${slot}`,
    slot,
    template: `<div id="${id}" style="width: 100%"></div>`,
    reset: true,
    style: {
      cursor: "default",
      flex: "1",
    },
  })

  // Let div root element get generated first.
  setTimeout(async () => {
    if (root != null) {
      await observeAndRender(id, root, height, levels, headingType, uuid)
    }
    if (nameArg === CURRENT) {
      observeRoute(
        id,
        height,
        levels,
        headingType,
        uuid,
        nameArg === CURRENT ? null : name,
      )
      if (name == null) {
        renderNoActivePage(id)
      }
    }
  }, 0)
}

function pushRoot(slot, embedRoot) {
  if (embedRoots[slot] == null) {
    embedRoots[slot] = []
  }
  if (embedRoots[slot].every((r) => r.id !== embedRoot.id)) {
    embedRoots[slot].push(embedRoot)
  }
}

function removeRoots(slot) {
  if (embedRoots[slot] == null) return
  embedRoots[slot] = undefined
}

async function renderTOC(id, root, height, levels, headingType, uuid) {
  const el = parent.document.getElementById(id)
  if (el == null) return

  const blocksToHighlight = await findBlocksToHighlight(levels, headingType)
  render(
    <TocGen
      slot={id}
      uuid={uuid}
      root={{ ...root }}
      height={height}
      levels={levels}
      headingType={headingType}
      blocksToHighlight={blocksToHighlight}
      pushRoot={pushRoot}
      removeRoots={removeRoots}
    />,
    el,
  )
}

function renderNoActivePage(id) {
  const rootEl = parent.document.getElementById(id)
  render(<div class="kef-tocgen-noactivepage" />, rootEl)
}

async function observeAndRender(id, root, height, levels, headingType, uuid) {
  const rootEl = parent.document.getElementById(id)

  async function renderIfPageBlock(node) {
    const roots = [root, ...(embedRoots[id] ?? [])]

    while (true) {
      const blockEl = node?.closest("[blockid]")
      if (blockEl == null) break
      const block = await logseq.Editor.getBlock(
        blockEl.getAttribute("blockid"),
      )
      if (block == null) break

      for (const r of roots) {
        if (
          (r.page == null && block.page?.id === r.id) ||
          (r.page != null && block.id === r.id)
        ) {
          await renderTOC(id, root, height, levels, headingType, uuid)
          return
        }
      }

      if (roots.length === 1 && root.page == null && !blockEl.dataset.embed)
        break

      node = blockEl.parentElement
    }
  }

  if (macroObservers[id] == null) {
    const observer = new MutationObserver(async (mutationList) => {
      let block = null

      if (rootEl == null || !rootEl.isConnected) {
        observer.disconnect()
        macroObservers[id] = undefined
        intersectionObservers[id]?.disconnect()
        intersectionObservers[id] = undefined
        return
      }

      loop: for (const mutation of mutationList) {
        for (const node of mutation.addedNodes) {
          if (
            node.className === "flex flex-row" ||
            node.className === "block-children-container flex" ||
            node.classList?.contains("block-editor") ||
            node.classList?.contains("ls-block")
          ) {
            block = node
            break loop
          }
        }
      }

      if (block != null) {
        await renderIfPageBlock(block)
      }

      if (height != null && intersectionObservers[id] != null) {
        for (const mutation of mutationList) {
          for (const node of mutation.addedNodes) {
            if (node.querySelectorAll) {
              const intersectionTargets = node.querySelectorAll(
                ".block-content-inner",
              )
              for (const target of intersectionTargets) {
                intersectionObservers[id].observe(target)
              }
            }
          }
          for (const node of mutation.removedNodes) {
            if (node.querySelectorAll) {
              const intersectionTargets = node.querySelectorAll(
                ".block-content-inner",
              )
              for (const target of intersectionTargets) {
                intersectionObservers[id].unobserve(target)
              }
            }
          }
        }
      }
    })
    macroObservers[id] = observer
    observer.observe(parent.document.body, {
      subtree: true,
      childList: true,
    })
  }

  if (height != null && intersectionObservers[id] == null) {
    const root = parent.document.getElementById("main-content-container")
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target.closest("[blockid]")
            const tocItemNode = parent.document.querySelector(
              `#${id} [data-ref="${el.getAttribute("blockid")}"]`,
            )
            if (tocItemNode) {
              tocItemNode.scrollIntoView({ block: "nearest" })
            }
          }
        }
      },
      { root, rootMargin: "0px", threshold: 1 },
    )
    intersectionObservers[id] = observer
    const targets = root.querySelectorAll(".block-content-inner")
    for (const target of targets) {
      observer.observe(target)
    }
  }

  await renderTOC(id, root, height, levels, headingType, uuid)
}

function observeRoute(id, height, levels, headingType, uuid, name) {
  if (routeOffHooks[id] == null) {
    routeOffHooks[id] = logseq.App.onRouteChanged(async ({ template }) => {
      const rootEl = parent.document.getElementById(id)
      if (rootEl == null || !rootEl.isConnected) {
        routeOffHooks[id]?.()
        routeOffHooks[id] = undefined
        return
      }

      macroObservers[id]?.disconnect()
      macroObservers[id] = undefined
      intersectionObservers[id]?.disconnect()
      intersectionObservers[id] = undefined

      if (template === "/") {
        renderNoActivePage(id)
      } else {
        let root = await logseq.Editor.getCurrentPage()
        if (root == null) {
          renderNoActivePage(id)
          return
        }
        if (root.page != null) {
          root = await logseq.Editor.getPage(root.page.id)
        }
        await observeAndRender(id, root, height, levels, headingType, uuid)
      }
    })
  }
}

async function findBlocksToHighlight(levels, headingType) {
  const nodes = []
  let node = parent.document.activeElement

  while (true) {
    const blockEl = node?.closest("[blockid],.embed-page")
    if (blockEl == null) break
    const block = blockEl.classList.contains("embed-page")
      ? await retrievePageBlock(blockEl)
      : await logseq.Editor.getBlock(blockEl.getAttribute("blockid"))
    if (block == null) break

    if (!EMBED_REGEX.test(block.content ?? "")) {
      nodes.unshift(block)
    }

    node = blockEl.parentElement
  }

  if (nodes.length > 0) {
    let block = nodes.shift()
    while (block != null) {
      nodes.unshift(block)
      block =
        block.parent &&
        (block.parent.id === block.page?.id
          ? await logseq.Editor.getPage(block.page.id)
          : await logseq.Editor.getBlock(block.parent.id))
    }
  }

  if (nodes.length <= 1) return null

  let index = nodes.length - 1 <= levels ? nodes.length - 2 : levels
  while (
    headingType === HeadingTypes.h &&
    index >= 0 &&
    !isHeading(nodes[index])
  ) {
    index--
  }

  return index < 0
    ? null
    : new Set(nodes.slice(0, index + 1).map((node) => node.id))
}

async function retrievePageBlock(pageEl) {
  const dataRefEl = pageEl.querySelector(".embed-header [data-ref]")
  if (dataRefEl == null) return null
  return await logseq.Editor.getPage(dataRefEl.dataset.ref)
}

async function getCurrentPageName() {
  let page = await logseq.Editor.getCurrentPage()
  if (page?.page != null) {
    page = await logseq.Editor.getPage(page.page.id)
  }
  return page?.name
}

async function openPageTOC(pageName) {
  // Open contents in sidebar if not already opened.
  let contentsEl = parent.document.querySelector(SIDEBAR_CONTENTS_SELECTOR)
  if (contentsEl == null) {
    const contentsPage = await logseq.Editor.getPage("contents")
    logseq.Editor.openInRightSidebar(contentsPage.uuid)
    // HACK: wait until content is loaded.
    contentsEl = await waitForEl(SIDEBAR_CONTENTS_SELECTOR, 5000)
    if (contentsEl) {
      await waitMs(100)
    }
  }
  await logseq.Editor.appendBlockInPage(
    "contents",
    contentsEl?.clientHeight + 100 < parent.window.innerHeight
      ? `{{renderer :tocgen2, [[${pageName}]], calc(100vh - ${
          contentsEl.clientHeight + 100
        }px)}}`
      : `{{renderer :tocgen2, [[${pageName}]]}}`,
  )
  // HACK: exitEditingMode does not work if called immediately after appending.
  await waitMs(50)
  await logseq.Editor.exitEditingMode()
}

const model = {
  backtop() {
    const mainContainer = parent.document.getElementById("main-container")
    const mainContentContainer = parent.document.getElementById(
      "main-content-container",
    )
    mainContentContainer.scroll({ top: 0 })
  },
  godown() {
    const mainContainer = parent.document.getElementById("main-container")
    const mainContentContainer = parent.document.getElementById(
      "main-content-container",
    )
    mainContentContainer.scroll({ top: mainContentContainer.scrollHeight })
  },
  async openTOC() {
    const pageName = await getCurrentPageName()
    if (pageName) {
      openPageTOC(pageName)
    } else {
      logseq.UI.showMsg(t("No page detected.", "warn"))
    }
  },
}

logseq.ready(model, main).catch(console.error)
