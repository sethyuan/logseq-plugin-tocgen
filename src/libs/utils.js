import { parse } from "./marked-renderer.js"

export async function parseContent(content) {
  // Remove front matter.
  content = content.replace(/---\n(-(?!--)|[^-])*\n---\n?/g, "")

  // Use only the first line.
  content = content.match(/.*/)[0]

  // Remove macro renderers.
  content = content.replace(/ \{\{renderer (?:\}[^\}]|[^\}])+\}\}/g, "")

  // Remove properties.
  content = content.replace(/\b[^:\n]+:: [^\n]+/g, "")

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
