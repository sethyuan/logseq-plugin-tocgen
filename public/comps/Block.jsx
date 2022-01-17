import { useContext, useEffect, useMemo, useState } from "preact/hooks"
import { HeadingTypes, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function Block({ root, block, levels, headingType }) {
  const [content, setContent] = useState("")
  const [collapsed, setCollapsed] = useState(
    logseq.settings?.defaultCollapsed ?? false,
  )
  const { lang } = useContext(ConfigContext)
  const pageName = useMemo(async () => {
    if (root.page) {
      return (await logseq.Editor.getPage(root.page.id)).name
    } else {
      return root.name
    }
  }, [root.name, root.page?.id])

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  async function goTo() {
    logseq.Editor.scrollToBlockInPage(await pageName, block.uuid)
  }

  function goInto() {
    logseq.Editor.scrollToBlockInPage(block.uuid)
  }

  function toggleCollapsed() {
    setCollapsed((v) => !v)
  }

  function arrowShouldCollapse() {
    return (
      collapsed &&
      block.level < levels &&
      (headingType === HeadingTypes.h
        ? block.children.some((subblock) => subblock.content.startsWith("#"))
        : block.children.length > 0)
    )
  }

  // Hide empty blocks and render/macro blocks.
  if (
    !content ||
    /^\s*{{/.test(content) ||
    (headingType === HeadingTypes.h && !block.content.startsWith("#"))
  )
    return null

  return (
    <>
      <div class="kef-tocgen-block">
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            style={{
              transform: arrowShouldCollapse() ? null : "rotate(90deg)",
            }}
          />
        </button>
        <span class="kef-tocgen-into inline" onClick={goInto}>
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
              root={root}
              block={subBlock}
              levels={levels}
              headingType={headingType}
            />
          ))}
        </div>
      )}
    </>
  )
}
