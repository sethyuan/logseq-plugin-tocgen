import { waitMs } from "jsutils"
import { parse } from "./marked-renderer.js"

export async function parseContent(content) {
  // Remove front matter.
  content = content.replace(/---\n(-(?!--)|[^-])*\n---\n?/g, "")

  // Use only the first line.
  content = content.match(/.*/)[0]

  // Remove macro renderers.
  content = content.replace(/(?: |^)\{\{renderer (?:\}[^\}]|[^\}])+\}\}/g, "")

  // Remove properties.
  content = content.replace(/^.+:: .+$/gm, "").trim()

  // Handle markdown.
  content = parse(content)

  // Handle LaTex
  content = content.replaceAll(/(\${1,2})([^\$]+)\1/g, (str, _, expr) => {
    if (parent.window.katex == null) return expr
    return parent.window.katex.renderToString(expr, { throwOnError: false })
  })

  if (!logseq.settings?.showTags) {
    // Remove tags.
    content = content.replace(/(^|\s)#((\[\[([^\]]|\](?!\]))+\]\])|\S+)/g, "")
  }

  // Replace block refs with their content.
  let match
  while ((match = /(?:\(\()(?!\()([^\)]+)\)\)/g.exec(content)) != null) {
    const start = match.index
    const end = start + match[0].length
    const refUUID = match[1]
    try {
      const refBlock = await logseq.Editor.getBlock(refUUID)
      const refFirstLine = refBlock.content.match(/.*/)[0]
      const refContent = await parseContent(refFirstLine)
      content = `${content.substring(0, start)}${refContent}${content.substring(
        end,
      )}`
    } catch (err) {
      // ignore err
      break
    }
  }

  // Remove page refs
  content = content.replace(/\[\[([^\]]+)\]\]/g, "$1")

  // Marker conversion
  content = content.replace(
    /^(TODO|LATER) /,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="display: inline; margin-right: 0.25em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"> <path stroke="none" d="M0 0h24v24H0z" fill="none"></path> <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"></path> </svg>`,
  )
  content = content.replace(
    /^(DOING|NOW) /,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="display: inline; margin-right: 0.25em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"> <path stroke="none" d="M0 0h24v24H0z" fill="none"></path> <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"></path> <path d="M9 12l2 2l4 -4"></path> </svg>`,
  )
  content = content.replace(
    /^DONE (.+)$/,
    `<span class="kef-tocgen-done"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" style="display: inline; margin-right: 0.25em" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"> <path stroke="none" d="M0 0h24v24H0z" fill="none"></path> <path d="M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005 .195v12.666c0 1.96 -1.537 3.56 -3.472 3.662l-.195 .005h-12.666a3.667 3.667 0 0 1 -3.662 -3.472l-.005 -.195v-12.666c0 -1.96 1.537 -3.56 3.472 -3.662l.195 -.005h12.666zm-2.626 7.293a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" stroke-width="0" fill="currentColor"></path> </svg>$1</span>`,
  )

  return content.trim()
}

export const HeadingTypes = {
  // Accepts anything as a heading
  any: "any",
  // Accepts only H1..Hn as headings
  h: "h",
}

export async function hash(text) {
  if (!text) return ""

  const bytes = new TextEncoder().encode(text)
  const hashedArray = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-1", bytes)),
  )
  const hashed = hashedArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return hashed
}

export const EMBED_REGEX =
  /^\s*(?:\[\[\.embed(-children)?\]\])?{{embed (\[\[[^\]]+\]\]|\(\([^\)]+\)\))\s*}}/

export function isHeading(block) {
  return (
    /^#+ /.test(block.content) ||
    block.properties?.heading ||
    EMBED_REGEX.test(block.content) ||
    block.page == null
  )
}

export function waitForEl(selector, timeout) {
  const start = Date.now()

  function tryFindEl(resolve) {
    const el = parent.document.querySelector(selector)
    if (el != null) {
      resolve(el)
    } else if (Date.now() - start <= timeout) {
      setTimeout(() => tryFindEl(resolve), 100)
    } else {
      resolve(null)
    }
  }

  return new Promise(tryFindEl)
}

export async function gotoBlock(pageName, blockUUID, count = 0) {
  logseq.Editor.scrollToBlockInPage(pageName, blockUUID)

  // Avoid infinite loop
  if (count >= 20) return

  const mainContentContainer = parent.document.getElementById(
    "main-content-container",
  )
  const blockEl = mainContentContainer.querySelector(`[blockid="${blockUUID}"]`)

  if (blockEl != null) {
    logseq.Editor.scrollToBlockInPage(pageName, blockUUID)
  } else {
    mainContentContainer.scroll({ top: mainContentContainer.scrollHeight })
    await waitMs(500)
    await gotoBlock(pageName, blockUUID, count + 1)
  }
}

export async function gotoOffset(container, scrollTop) {
  let count = 0
  while (container.scrollTop !== scrollTop) {
    // Safe guard
    if (count++ >= 20) return
    container.scrollTop = scrollTop
    await waitMs(500)
  }
}
