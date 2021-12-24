export async function parseContent(content) {
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

  // Remove properties. TODO
  content = content.replace(/\n[^:]+:: [^\n]+/g, "")

  // Remove heading markup.
  content = content.replace(/^#+\s*/, "")

  // Remove page refs
  content = content.replace(/\[\[([^\]]+)\]\]/g, "$1")

  return content
}
