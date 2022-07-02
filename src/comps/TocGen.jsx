import { t } from "logseq-l10n"
import { useEffect, useMemo, useState } from "preact/hooks"
import { cls } from "reactutils"
import { HeadingTypes, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import Block from "./Block.jsx"

export default function TocGen({
  root,
  blocks,
  levels,
  headingType,
  blocksToHighlight,
  uuid,
}) {
  const [name, setName] = useState(() =>
    root.page == null ? root.originalName ?? root.name : "",
  )
  const [collapsed, setCollapsed] = useState(false)
  const [childrenCollapsed, setChildrenCollapsed] = useState(() =>
    blocks.reduce((status, block) => {
      status[block.id] = (logseq.settings?.defaultExpansionLevel ?? 1) <= 1
      return status
    }, {}),
  )

  useEffect(() => {
    setChildrenCollapsed((values) =>
      blocks.reduce((status, block) => {
        status[block.id] =
          values[block.id] ?? (logseq.settings?.defaultExpansionLevel ?? 1) <= 1
        return status
      }, {}),
    )
  }, [blocks])

  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])

  useEffect(() => {
    if (root.page != null) {
      ;(async () => {
        setName(await parseContent(root.content))
      })()
    } else {
      setName(root.originalName ?? root.name)
    }
  }, [root])

  function onClick(e) {
    if (e.shiftKey) {
      openInSidebar()
    } else {
      goTo()
    }
  }

  function goTo(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar(root.uuid)
    } else {
      if (root.page == null) {
        logseq.Editor.scrollToBlockInPage(root.name)
      } else {
        logseq.Editor.scrollToBlockInPage(root.uuid)
      }
    }
  }

  async function goToPage(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar((await page).uuid)
    } else {
      logseq.Editor.scrollToBlockInPage((await page).name, root.uuid)
    }
  }

  function toggleCollapsed() {
    setCollapsed((v) => !v)
  }

  function toggleCollapseChildren() {
    if (
      blocks.some(
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
        blocks.reduce((status, block) => {
          status[block.id] = true
          return status
        }, {}),
      )
    } else {
      setChildrenCollapsed(
        blocks.reduce((status, block) => {
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

  if (blocks == null) {
    return <div style={{ color: "#f00" }}>{t("Page/Block not found!")}</div>
  }

  return (
    <>
      <div
        class={cls(
          "kef-tocgen-page",
          blocksToHighlight == null && "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            style={{
              transform: collapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <span
          className="inline"
          onClick={goTo}
          dangerouslySetInnerHTML={{ __html: name }}
        ></span>
        {root.page != null && !logseq.settings?.noPageJump && (
          <button class="kef-tocgen-to" onClick={goToPage}>
            {t("page")}
          </button>
        )}
      </div>
      <div className="kef-tocgen-block-children">
        <div
          className="kef-tocgen-block-collapse"
          onClick={toggleCollapseChildren}
        />
        {blocks.map((block) => (
          <Block
            key={block.id}
            root={root}
            block={block}
            levels={levels}
            headingType={headingType}
            blocksToHighlight={blocksToHighlight}
            hidden={collapsed}
            collapsed={childrenCollapsed[block.id]}
            onCollapseChange={onBlockCollapseChange}
          />
        ))}
      </div>
    </>
  )
}
