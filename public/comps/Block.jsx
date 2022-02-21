import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks"
import { cls } from "reactutils"
import { HeadingTypes, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function Block({
  root,
  block,
  levels,
  headingType,
  blockToHighlight,
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
  const elRef = useRef()

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  useEffect(() => {
    if (block.id === blockToHighlight?.id && elRef.current) {
      elRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [block.id, blockToHighlight?.id])

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
        ? block.children.some(
            (subblock) =>
              subblock.content.startsWith("#") || subblock.properties?.heading,
          )
        : block.children.length > 0)
    )
  }

  if (collapsed) return null

  // Hide empty blocks and render/macro blocks.
  if (
    !content ||
    /^\s*{{/.test(content) ||
    (headingType === HeadingTypes.h &&
      !block.content.startsWith("#") &&
      !block.properties?.heading)
  )
    return null

  return (
    <>
      <div
        ref={elRef}
        class={cls(
          "kef-tocgen-block",
          block.id === blockToHighlight?.id && "kef-tocgen-active-block",
        )}
      >
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
              blockToHighlight={blockToHighlight}
              collapsed={childrenCollapsed}
            />
          ))}
        </div>
      )}
    </>
  )
}
