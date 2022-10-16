import { t } from "logseq-l10n"
import { useContext, useEffect, useMemo, useState } from "preact/hooks"
import { cls } from "reactutils"
import { CollapseContext, EmbedContext } from "../contexts.js"
import { EMBED_REGEX, HeadingTypes, isHeading, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"

export default function Block({
  slot,
  root,
  block,
  levels,
  headingType,
  blocksToHighlight,
  embedId,
  onEmbedChildToggle,
  levelOffset = 0,
}) {
  const blockLevel = (block.level ?? 0) + levelOffset

  const [content, setContent] = useState("")
  // Hide blocks with 'toc:: no' property, empty blocks and render/macro blocks.
  const valid = useMemo(
    () =>
      block.properties?.toc !== "no" &&
      content &&
      !/^\s*{{/.test(content) &&
      (headingType !== HeadingTypes.h || isHeading(block)),
    [block, content, headingType],
  )
  const [embed, setEmbed] = useState()
  const [embedChildren, setEmbedChildren] = useState(false)
  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])
  const [collapseState, setCollapseState] = useContext(CollapseContext)
  const { pushRoot, removeRoot } = useContext(EmbedContext)
  const collapseId = (!onEmbedChildToggle && embedId) || block.id
  const [childrenFlag, setChildrenFlag] = useState(false)

  useEffect(() => {
    ;(async () => {
      const match = block.content.match(EMBED_REGEX)
      if (match) {
        const [, childrenFlag, idStr] = match
        const isPage = idStr.startsWith("[[")
        const id = idStr.substring(2, idStr.length - 2)
        const embedBlock = isPage
          ? await (async () => {
              const page = await logseq.Editor.getPage(id)
              const content = page.name
              const children = await logseq.Editor.getPageBlocksTree(page.name)
              return Object.assign(page, { content, children })
            })()
          : await logseq.Editor.getBlock(id, { includeChildren: true })
        setEmbed(embedBlock)
        setEmbedChildren(!!childrenFlag)
        if (childrenFlag) {
          setCollapseState((old) => {
            const expansionLevel = +(
              logseq.settings?.defaultExpansionLevel ?? 1
            )
            const newValue = {
              [collapseId]: expansionLevel <= blockLevel,
            }
            return { ...old, ...newValue }
          })
        }
      } else {
        setEmbed()
        setEmbedChildren(false)
        setContent(await parseContent(block.content))
      }
      setChildrenFlag(false)
      setTimeout(() => setChildrenFlag(true), 50)
    })()
  }, [block])

  useEffect(() => {
    if (valid && collapseState[collapseId] == null) {
      setCollapseState((old) => {
        const expansionLevel = +(logseq.settings?.defaultExpansionLevel ?? 1)
        const newValue = {
          [collapseId]: expansionLevel <= blockLevel,
        }
        return { ...old, ...newValue }
      })
    }
  }, [valid, collapseState[collapseId]])

  useEffect(() => {
    if (embed) {
      pushRoot(slot, { id: embed.id, page: embed.page })
    }

    return () => {
      if (embed) {
        removeRoot(slot, embed.id)
      }
    }
  }, [embed])

  function setBlocksCollapse(blocks, collapse) {
    setCollapseState((old) => {
      const newValues = {}
      for (const block of blocks) {
        newValues[block.id] = collapse
      }
      return { ...old, ...newValues }
    })
  }

  useEffect(() => {
    if (embed?.children) {
      const children = embed.children.filter(
        (child) => collapseState[child.id] != null,
      )
      if (
        collapseState[collapseId] &&
        children.every((child) => !collapseState[child.id])
      ) {
        setBlocksCollapse(children, true)
      } else if (
        !collapseState[collapseId] &&
        children.some((child) => collapseState[child.id])
      ) {
        setBlocksCollapse(children, false)
      }
    }
  }, [collapseState[collapseId], embed?.children])

  async function goTo(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar((await page).uuid)
    } else {
      if (block.page == null && block.children?.[0]) {
        logseq.Editor.scrollToBlockInPage(
          (await page).name,
          block.children[0].uuid,
        )
      } else {
        logseq.Editor.scrollToBlockInPage((await page).name, block.uuid)
      }
    }
  }

  function goInto(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar(block.uuid)
    } else {
      if (block.page == null) {
        logseq.Editor.scrollToBlockInPage(block.name)
      } else {
        logseq.Editor.scrollToBlockInPage(block.uuid)
      }
    }
  }

  function toggleCollapsed() {
    if (onEmbedChildToggle) {
      onEmbedChildToggle(collapseId)
    } else {
      setCollapseState((old) => {
        const newValue = { [collapseId]: !old[collapseId] }
        return { ...old, ...newValue }
      })
    }
  }

  function toggleCollapseChildren() {
    const children = block.children.filter(
      (child) => collapseState[child.id] != null,
    )
    const hasCollapsedChild = children.some(
      (subblock) => collapseState[subblock.id],
    )
    if (hasCollapsedChild) {
      setBlocksCollapse(children, false)
    } else {
      setBlocksCollapse(children, true)
    }
  }

  function toggleEmbedChild(childId) {
    setCollapseState((old) => {
      const newChildValue = !old[childId]
      const children = embed.children
        .filter((child) => collapseState[child.id] != null)
        .map((child) =>
          child.id === childId ? newChildValue : collapseState[child.id],
        )
      const someChildIsCollapsed = children.some((collapsed) => collapsed)
      const newValues = {
        [collapseId]: someChildIsCollapsed,
        [childId]: newChildValue,
      }
      return { ...old, ...newValues }
    })
  }

  if (embed) {
    if (embedChildren) {
      return embed.children.map((child) => (
        <Block
          key={child.id}
          slot={slot}
          root={root}
          block={child}
          levels={levels}
          headingType={headingType}
          blocksToHighlight={blocksToHighlight}
          embedId={block.id}
          onEmbedChildToggle={toggleEmbedChild}
          levelOffset={blockLevel}
        />
      ))
    } else {
      return (
        <Block
          slot={slot}
          root={root}
          block={embed}
          levels={levels}
          headingType={headingType}
          blocksToHighlight={blocksToHighlight}
          embedId={block.id}
          levelOffset={blockLevel}
        />
      )
    }
  }

  if (!valid) return null

  const hasValidChildren = block.children.some(
    (subblock) => collapseState[subblock.id] != null,
  )

  return (
    <>
      <div
        class={cls(
          "kef-tocgen-block",
          blocksToHighlight?.has(block.id) && "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            class={!hasValidChildren && "kef-tocgen-arrow-hidden"}
            style={{
              transform: collapseState[collapseId] ? null : "rotate(90deg)",
            }}
          />
        </button>
        <div>
          <span
            class="kef-tocgen-into inline"
            data-ref={block.uuid}
            onClick={goInto}
            dangerouslySetInnerHTML={{ __html: content }}
          ></span>
          {!logseq.settings?.noPageJump && (
            <button class="kef-tocgen-to" onClick={goTo}>
              {t("page")}
            </button>
          )}
        </div>
      </div>
      {blockLevel < levels && (!childrenFlag || !collapseState[collapseId]) && (
        <div class="kef-tocgen-block-children">
          <div
            className="kef-tocgen-block-collapse"
            onClick={toggleCollapseChildren}
          />
          {block.children.map((subBlock) => (
            <Block
              key={subBlock.id}
              slot={slot}
              root={root}
              block={subBlock}
              levels={levels}
              headingType={headingType}
              blocksToHighlight={blocksToHighlight}
              levelOffset={levelOffset}
            />
          ))}
        </div>
      )}
    </>
  )
}
