import { useContext, useEffect, useState } from "preact/hooks"
import Arrow from "./Arrow.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function Block({ page, block, levels }) {
  const [content, setContent] = useState("")
  const [collapsed, setCollapsed] = useState(
    logseq.settings?.defaultCollapsed ?? false,
  )
  const { lang } = useContext(ConfigContext)

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  function goTo() {
    logseq.Editor.scrollToBlockInPage(page.name, block.uuid)
  }

  function goInto() {
    logseq.Editor.scrollToBlockInPage(block.uuid)
  }

  function toggleCollapsed() {
    setCollapsed((v) => !v)
  }

  // Hide empty blocks.
  if (!block.content) return null

  return (
    <>
      <div class="kef-tocgen-block">
        {(block.level === 1 ||
          (block.level < levels && block.children.length > 0)) && (
          <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
            <Arrow style={{ transform: collapsed ? null : "rotate(90deg)" }} />
          </button>
        )}
        <span class="kef-tocgen-into" onClick={goInto}>
          {content}
        </span>
        <button class="kef-tocgen-to" onClick={goTo}>
          {lang === "zh-CN" ? "页面" : "page"}
        </button>
      </div>
      {block.level < levels && !collapsed && (
        <div class="kef-tocgen-block-children">
          {block.children.map((subBlock) => (
            <Block
              key={subBlock.id}
              page={page}
              block={subBlock}
              levels={levels}
            />
          ))}
        </div>
      )}
    </>
  )
}

async function parseContent(content) {
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

  // Remove ref IDs.
  content = content.replace(/\nid:: [a-z0-9\-]+/g, "")

  // Remove heading markup.
  content = content.replace(/^#+\s*/, "")

  // Remove page refs
  content = content.replace(/\[\[([^\]]+)\]\]/g, "$1")

  return content
}
