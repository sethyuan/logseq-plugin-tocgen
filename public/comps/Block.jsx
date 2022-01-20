import { useContext, useEffect, useMemo, useState } from "preact/hooks"
import { HeadingTypes, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function Block({
  root,
  block,
  levels,
  headingType,
  collapsed = false,
}) {
  const [content, setContent] = useState("")
  const [childrenCollapsed, setChildrenCollapsed] = useState(
    logseq.settings?.defaultCollapsed ?? false,
  )
  const { lang } = useContext(ConfigContext)
  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  async function goTo(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar((await page).uuid)
    } else {
      logseq.Editor.scrollToBlockInPage((await page).name, block.uuid)
    }
  }

  function goInto(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar(block.uuid)
    } else {
      logseq.Editor.scrollToBlockInPage(block.uuid)
    }
  }

  function toggleCollapsed() {
    setChildrenCollapsed((v) => !v)
  }

  function arrowShouldCollapse() {
    return (
      childrenCollapsed &&
      block.level < levels &&
      (headingType === HeadingTypes.h
        ? block.children.some((subblock) => subblock.content.startsWith("#"))
        : block.children.length > 0)
    )
  }

  if (collapsed) return null

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
      {block.level < levels && (
        <div class="kef-tocgen-block-children">
          {block.children.map((subBlock) => (
            <Block
              key={subBlock.id}
              root={root}
              block={subBlock}
              levels={levels}
              headingType={headingType}
              collapsed={childrenCollapsed}
            />
          ))}
        </div>
      )}
    </>
  )
}
