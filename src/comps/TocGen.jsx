import { t } from "logseq-l10n"
import { useCallback, useEffect, useState } from "preact/hooks"
import { cls } from "reactutils"
import {
  EMBED_REGEX,
  HeadingTypes,
  isHeading,
  parseContent,
} from "../libs/utils.js"
import Arrow from "./Arrow.jsx"
import Block from "./Block.jsx"
import CollapseAllIcon from "./CollapseAllIcon.jsx"
import DeleteIcon from "./DeleteIcon.jsx"
import EditIcon from "./EditIcon.jsx"
import ExpandAllIcon from "./ExpandAllIcon.jsx"

export default function TocGen({
  slot,
  uuid,
  root,
  height,
  levels,
  headingType,
  blocksToHighlight,
  pushRoot,
  removeRoots,
}) {
  const [data, setData] = useState()
  const [page, setPage] = useState()

  const constructData = useCallback(
    async (
      src,
      level,
      maxLevel,
      expansionLevel,
      headingType,
      collapsings,
      slot,
    ) => {
      if (level > maxLevel) return null

      const content =
        src.page == null
          ? src.originalName ?? src.name
          : await parseContent(src.content)

      if (level > 0 && !isValid(src, content, headingType)) return null

      const node = {
        id: src.id,
        uuid: src.uuid,
        name: src.name,
        content,
        collapsed: collapsings[src.id] ?? level >= expansionLevel,
        children: [],
      }

      const embedMatch = src.content?.match(EMBED_REGEX)
      if (embedMatch) {
        const [, childrenFlag, idStr] = embedMatch
        const isPage = idStr.startsWith("[[")
        const id = idStr.substring(2, idStr.length - 2)
        const embedded = isPage
          ? await (async () => {
              const page = await logseq.Editor.getPage(id)
              page.children = await logseq.Editor.getPageBlocksTree(page.name)
              return page
            })()
          : await logseq.Editor.getBlock(id, { includeChildren: true })

        pushRoot(slot, { id: embedded.id, page: embedded.page ?? embedded })

        if (childrenFlag) {
          const children = (
            await Promise.all(
              embedded.children.map((child) =>
                constructData(
                  child,
                  level,
                  maxLevel,
                  expansionLevel,
                  headingType,
                  collapsings,
                  slot,
                ),
              ),
            )
          ).filter((x) => x != null)

          for (const child of children) {
            child.parent = node
          }

          return children
        } else {
          const child = await constructData(
            embedded,
            level,
            maxLevel,
            expansionLevel,
            headingType,
            collapsings,
            slot,
          )

          if (child != null) {
            child.embeddingUUID = src.uuid
            child.parent = node
          }

          return child
        }
      }

      for (const child of src.children) {
        const ret = await constructData(
          child,
          level + 1,
          maxLevel,
          expansionLevel,
          headingType,
          collapsings,
          slot,
        )
        if (ret != null) {
          node.children.push(...(Array.isArray(ret) ? ret : [ret]))
        }
      }
      for (const child of node.children) {
        child.parent = node
      }

      return node
    },
    [],
  )

  const refetchData = useCallback(async () => {
    removeRoots(slot)

    const expansionLevel = +(logseq.settings?.defaultExpansionLevel ?? 1)
    root.children =
      root.page == null
        ? await logseq.Editor.getPageBlocksTree(root.name)
        : (await logseq.Editor.getBlock(root.id, { includeChildren: true }))
            .children
    const collapsings = {}
    if (data != null) {
      toCollapsingMap(collapsings, data)
    }
    setData(
      await constructData(
        root,
        0,
        levels,
        expansionLevel,
        headingType,
        collapsings,
        slot,
      ),
    )
  }, [root, slot, data])

  useEffect(() => {
    ;(async () => {
      setPage(
        root.page == null ? root : await logseq.Editor.getPage(root.page.id),
      )
      await refetchData()
    })()
  }, [root, slot])

  const goTo = useCallback(
    (e) => {
      if (e.shiftKey) {
        logseq.Editor.openInRightSidebar(root.uuid)
      } else {
        if (root.page == null) {
          logseq.Editor.scrollToBlockInPage(root.name)
        } else {
          logseq.Editor.scrollToBlockInPage(root.uuid)
        }
      }
    },
    [root],
  )

  const toggleCollapsed = useCallback(() => {
    setData((data) => {
      const newData = { ...data }
      newData.collapsed = !newData.collapsed
      return newData
    })
  }, [])

  const toggleCollapseChildren = useCallback(() => {
    setData((data) => {
      const newData = { ...data }
      if (
        newData.children.some(
          (child) => child.children.length > 0 && child.collapsed,
        )
      ) {
        for (const child of newData.children) {
          child.collapsed = false
        }
      } else {
        for (const child of newData.children) {
          child.collapsed = true
        }
      }
      return newData
    })
  }, [])

  const expandAll = useCallback(() => {
    setData((data) => {
      const newData = { ...data }
      const rootCollapsed = newData.collapsed
      setCollapsed(newData, false)
      newData.collapsed = rootCollapsed
      return newData
    })
  }, [])

  const collapseAll = useCallback(() => {
    setData((data) => {
      const newData = { ...data }
      const rootCollapsed = newData.collapsed
      setCollapsed(newData, true)
      newData.collapsed = rootCollapsed
      return newData
    })
  }, [])

  const editBlock = useCallback(() => logseq.Editor.editBlock(uuid), [uuid])
  const deleteBlock = useCallback(() => logseq.Editor.removeBlock(uuid), [uuid])

  if (data == null || page == null) return null

  return (
    <div
      class="kef-tocgen-container"
      style={
        height == null
          ? undefined
          : {
              maxHeight: height,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }
      }
    >
      <div
        class={cls(
          "kef-tocgen-page",
          (blocksToHighlight == null || blocksToHighlight.has(data.id)) &&
            "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            style={{
              transform: data.collapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <div>
          <span
            class={cls("inline", root.page == null ? "page" : "block")}
            data-ref={root.page == null ? root.name : root.uuid}
            onClick={goTo}
            dangerouslySetInnerHTML={{ __html: data.content }}
          ></span>
          <button
            style={{ marginLeft: "6px" }}
            title={t("Expand All")}
            onClick={expandAll}
          >
            <ExpandAllIcon />
          </button>
          <button title={t("Collapse All")} onClick={collapseAll}>
            <CollapseAllIcon />
          </button>
          <button title={t("Edit")} onClick={editBlock}>
            <EditIcon />
          </button>
          <button title={t("Delete")} onClick={deleteBlock}>
            <DeleteIcon />
          </button>
        </div>
      </div>
      {!data.collapsed && data.children.length > 0 && (
        <div className="kef-tocgen-block-children">
          <div
            className="kef-tocgen-block-collapse"
            onClick={toggleCollapseChildren}
          />
          {data.children.map((block, i) => (
            <Block
              key={block.id}
              block={block}
              page={page}
              blocksToHighlight={blocksToHighlight}
              path={[i]}
              setData={setData}
              refetchData={refetchData}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function isValid(block, content, headingType) {
  return (
    block.properties?.toc !== "no" &&
    content &&
    !/^\s*{{(?!embed )/.test(content) &&
    (headingType !== HeadingTypes.h || isHeading(block))
  )
}

function setCollapsed(node, value) {
  node.collapsed = value
  for (const child of node.children) {
    setCollapsed(child, value)
  }
}

function toCollapsingMap(map, node) {
  map[node.id] = node.collapsed
  for (const child of node.children) {
    toCollapsingMap(map, child)
  }
}
