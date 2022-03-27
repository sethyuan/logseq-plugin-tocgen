import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks"
import { cls, useDependentState } from "reactutils"
import { HeadingTypes, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function Block({
  root,
  block,
  levels,
  headingType,
  blockToHighlight,
  hidden,
  collapsed,
  onCollapseChange,
}) {
  const [content, setContent] = useState("")
  const [childrenCollapsed, setChildrenCollapsed] = useDependentState(
    () =>
      block.children.reduce((status, block) => {
        status[block.id] = logseq.settings?.defaultCollapsed ?? false
        return status
      }, {}),
    [],
  )
  const { lang } = useContext(ConfigContext)
  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])
  const subblocksRef = useRef()
  const [noChildren, setNoChildren] = useState(false)

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  useEffect(() => {
    const val = subblocksRef.current?.childElementCount <= 1
    if (noChildren !== val) {
      setNoChildren(val)
    }
  })

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
    onCollapseChange?.(block.id, !collapsed)
  }

  function toggleCollapseChildren() {
    if (
      block.children.some(
        (block) =>
          !childrenCollapsed[block.id] &&
          block.level < levels &&
          (headingType === HeadingTypes.h
            ? block.children.some(
                (subblock) =>
                  subblock.content.startsWith("#") ||
                  subblock.properties?.heading,
              )
            : block.children.length > 0),
      )
    ) {
      setChildrenCollapsed(
        block.children.reduce((status, block) => {
          status[block.id] = true
          return status
        }, {}),
      )
    } else {
      setChildrenCollapsed(
        block.children.reduce((status, block) => {
          status[block.id] = false
          return status
        }, {}),
      )
    }
  }

  function onBlockCollapseChange(blockId, blockCollapsed) {
    setChildrenCollapsed((old) => ({
      ...old,
      [blockId]: blockCollapsed,
    }))
  }

  if (hidden) return null

  // Hide empty blocks and render/macro blocks.
  if (
    !content ||
    /^\s*{{/.test(content) ||
    (headingType === HeadingTypes.h &&
      !block.content.startsWith("#") &&
      !block.properties?.heading)
  )
    return null

  const arrowCollapsed =
    collapsed &&
    block.level < levels &&
    (headingType === HeadingTypes.h
      ? block.children.some(
          (subblock) =>
            subblock.content.startsWith("#") || subblock.properties?.heading,
        )
      : block.children.length > 0)

  return (
    <>
      <div
        class={cls(
          "kef-tocgen-block",
          block.id === blockToHighlight?.id && "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            class={cls(
              !arrowCollapsed && noChildren && "kef-tocgen-arrow-hidden",
            )}
            style={{
              transform: arrowCollapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <span class="kef-tocgen-into inline" onClick={goInto}>
          {content}
        </span>
        {!logseq.settings?.noPageJump && (
          <button class="kef-tocgen-to" onClick={goTo}>
            {lang === "zh-CN" ? "页面" : "page"}
          </button>
        )}
      </div>
      {block.level < levels && (
        <div class="kef-tocgen-block-children" ref={subblocksRef}>
          <div
            className="kef-tocgen-block-collapse"
            onClick={toggleCollapseChildren}
          />
          {block.children.map((subBlock) => (
            <Block
              key={subBlock.id}
              root={root}
              block={subBlock}
              levels={levels}
              headingType={headingType}
              blockToHighlight={blockToHighlight}
              hidden={collapsed}
              collapsed={childrenCollapsed[subBlock.id]}
              onCollapseChange={onBlockCollapseChange}
            />
          ))}
        </div>
      )}
    </>
  )
}
