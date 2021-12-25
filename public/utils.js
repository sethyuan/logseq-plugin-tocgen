export async function parseContent(content) {
  content = content.replace(/---\n(-(?!--)|[^-])*\n---\n?/g, "")

  // Replace block refs into their content
  let match
  while ((match = /\(\(([^\)]+)\)\)/d.exec(content)) != null) {
    const [start, end] = match.indices[0]
    const refUUID = match[1]
    const refBlock = await logseq.Editor.getBlock(refUUID)
    const refContent = await parseContent(refBlock.content)
    content = `${content.substring(0, start)}${refContent}${content.substring(
      end,
    )}`
  }

  // Remove properties.
  content = content.replace(/(^|\n)[^:]+:: [^\n]+/g, "")

  // Remove heading markup.
  content = content.replace(/^#+\s*/, "")

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
