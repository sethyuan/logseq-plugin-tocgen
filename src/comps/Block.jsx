import { t } from "logseq-l10n"
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks"
import { cls } from "reactutils"
import { EmbedContext } from "../contexts.js"
import { EMBED_REGEX, HeadingTypes, isHeading, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"

export default function Block({
  slot,
  root,
  block,
  levels,
  headingType,
  blocksToHighlight,
  hidden,
  collapsed,
  onCollapseChange,
  levelOffset = 0,
}) {
  const blockLevel = (block.level ?? 0) + levelOffset

  const [content, setContent] = useState("")
  const [embed, setEmbed] = useState()
  const [embedChildren, setEmbedChildren] = useState(false)
  const [childrenCollapsed, setChildrenCollapsed] = useState(() =>
    block.children.reduce((status, block) => {
      status[block.id] =
        +(logseq.settings?.defaultExpansionLevel ?? 1) <= blockLevel
      return status
    }, {}),
  )
  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])
  const subblocksRef = useRef()
  const [noChildren, setNoChildren] = useState(true)

  const { pushRoot, removeRoot } = useContext(EmbedContext)

  useEffect(() => {
    setChildrenCollapsed((values) =>
      ((embedChildren ? embed.children : undefined) ?? block.children).reduce(
        (status, block) => {
          status[block.id] =
            values[block.id] ??
            +(logseq.settings?.defaultExpansionLevel ?? 1) <= blockLevel
          return status
        },
        {},
      ),
    )
  }, [block.children, embedChildren, embed, blockLevel])

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
      } else {
        setEmbed()
        setEmbedChildren(false)
        setContent(await parseContent(block.content))
      }
    })()
  }, [block])

  useEffect(() => {
    setTimeout(() => {
      if (subblocksRef.current?.childElementCount > 1) {
        setNoChildren(false)
      }
    }, 50)
  }, [collapsed])

  useEffect(() => {
    if (embedChildren) {
      setChildrenCollapsed(
        embed.children.reduce((status, block) => {
          status[block.id] = collapsed
          return status
        }, {}),
      )
    }
  }, [collapsed, embedChildren, embed])

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
    onCollapseChange?.(block.id, !collapsed)
  }

  function toggleCollapseChildren() {
    if (
      block.children.some(
        (block) =>
          !childrenCollapsed[block.id] &&
          blockLevel < levels &&
          (/{{embed /.test(block.content) ||
            (headingType === HeadingTypes.h
              ? block.children.some((subblock) => isHeading(subblock))
              : block.children.length > 0)),
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
    setChildrenCollapsed((old) => {
      const newValue = {
        ...old,
        [blockId]: blockCollapsed,
      }
      if (embedChildren) {
        const values = Object.values(newValue)
        if (values.every((t) => t)) {
          onCollapseChange?.(block.id, true)
        } else if (values.every((t) => !t)) {
          onCollapseChange?.(block.id, false)
        }
      }
      return newValue
    })
  }

  function onEmbedCollapseChange(embedBlockId, blockCollapsed) {
    onCollapseChange?.(block.id, blockCollapsed)
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
          hidden={hidden}
          collapsed={childrenCollapsed[child.id]}
          onCollapseChange={onBlockCollapseChange}
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
          hidden={hidden}
          collapsed={collapsed}
          onCollapseChange={onEmbedCollapseChange}
          levelOffset={blockLevel}
        />
      )
    }
  }

  if (hidden) return null

  // Hide blocks with 'toc:: no' property, empty blocks and render/macro blocks.
  if (
    block.properties?.toc === "no" ||
    !content ||
    /^\s*{{/.test(content) ||
    (headingType === HeadingTypes.h && !isHeading(block))
  )
    return null

  const arrowCollapsed =
    collapsed &&
    blockLevel < levels &&
    (headingType === HeadingTypes.h
      ? block.children.some((subblock) => isHeading(subblock))
      : block.children.filter((subblock) => subblock.properties?.toc !== "no")
          .length > 0)

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
            class={cls(
              !arrowCollapsed && noChildren && "kef-tocgen-arrow-hidden",
            )}
            style={{
              transform: arrowCollapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
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
      {blockLevel < levels && (
        <div class="kef-tocgen-block-children" ref={subblocksRef}>
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
              hidden={collapsed}
              collapsed={childrenCollapsed[subBlock.id]}
              onCollapseChange={onBlockCollapseChange}
              levelOffset={levelOffset}
            />
          ))}
        </div>
      )}
    </>
  )
}
