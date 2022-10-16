import { t } from "logseq-l10n"
import { useEffect, useMemo, useState } from "preact/hooks"
import { cls } from "reactutils"
import { CollapseContext } from "../contexts.js"
import { parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import Block from "./Block.jsx"
import CollapseAllIcon from "./CollapseAllIcon.jsx"
import ExpandAllIcon from "./ExpandAllIcon.jsx"

export default function TocGen({
  slot,
  root,
  blocks,
  levels,
  headingType,
  blocksToHighlight,
}) {
  const [name, setName] = useState(() =>
    root.page == null ? root.originalName ?? root.name : "",
  )

  const [collapseState, setCollapseState] = useState(() => {
    const expansionLevel = +(logseq.settings?.defaultExpansionLevel ?? 1)
    return { [root.id]: expansionLevel === 0 }
  })
  const collapseContextValue = useMemo(
    () => [collapseState, setCollapseState],
    [collapseState, setCollapseState],
  )

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

    const expansionLevel = +(logseq.settings?.defaultExpansionLevel ?? 1)
    setCollapseState({ [root.id]: expansionLevel === 0 })
  }, [root])

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
    setCollapseState((old) => {
      const newValue = { [root.id]: !old[root.id] }
      return { ...old, ...newValue }
    })
  }

  function toggleCollapseChildren() {
    const children = blocks.filter((block) => collapseState[block.id] != null)
    const hasCollapsedChild = children.some((child) => collapseState[child.id])
    if (hasCollapsedChild) {
      setCollapseState((old) => {
        const newValues = {}
        for (const block of children) {
          newValues[block.id] = false
        }
        return { ...old, ...newValues }
      })
    } else {
      setCollapseState((old) => {
        const newValues = {}
        for (const block of children) {
          newValues[block.id] = true
        }
        return { ...old, ...newValues }
      })
    }
  }

  function expandAll() {
    setCollapseState((old) => {
      const ret = {}
      const rootCollapsing = old[root.id]
      for (const key of Object.keys(old)) {
        ret[key] = false
      }
      ret[root.id] = rootCollapsing
      return ret
    })
  }

  function collapseAll() {
    setCollapseState((old) => {
      const ret = {}
      const rootCollapsing = old[root.id]
      for (const key of Object.keys(old)) {
        ret[key] = true
      }
      ret[root.id] = rootCollapsing
      return ret
    })
  }

  if (blocks == null) {
    return <div style={{ color: "#f00" }}>{t("Page/Block not found!")}</div>
  }

  return (
    <>
      <div
        class={cls(
          "kef-tocgen-page",
          (blocksToHighlight == null || blocksToHighlight.has(root.id)) &&
            "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            style={{
              transform: collapseState[root.id] ? null : "rotate(90deg)",
            }}
          />
        </button>
        <div>
          <span
            class={cls("inline", root.page == null ? "page" : "block")}
            data-ref={root.page == null ? root.name : root.uuid}
            onClick={goTo}
            dangerouslySetInnerHTML={{ __html: name }}
          ></span>
          {root.page != null && !logseq.settings?.noPageJump && (
            <button class="kef-tocgen-to" onClick={goToPage}>
              {t("page")}
            </button>
          )}
          <button style={{ marginLeft: "8px" }} onClick={expandAll}>
            <ExpandAllIcon />
          </button>
          <button onClick={collapseAll}>
            <CollapseAllIcon />
          </button>
        </div>
      </div>
      <CollapseContext.Provider value={collapseContextValue}>
        {!collapseState[root.id] && (
          <div className="kef-tocgen-block-children">
            <div
              className="kef-tocgen-block-collapse"
              onClick={toggleCollapseChildren}
            />
            {blocks.map((block) => (
              <Block
                key={block.id}
                slot={slot}
                root={root}
                block={block}
                levels={levels}
                headingType={headingType}
                blocksToHighlight={blocksToHighlight}
              />
            ))}
          </div>
        )}
      </CollapseContext.Provider>
    </>
  )
}
