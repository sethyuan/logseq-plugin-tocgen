import produce from "immer"
import { useCallback } from "preact/hooks"
import { cls } from "reactutils"
import { gotoBlock } from "../libs/utils.js"
import Arrow from "./Arrow.jsx"

export default function Block({
  block,
  page,
  blocksToHighlight,
  path,
  setData,
  refetchData,
}) {
  const goTo = useCallback(
    (e) => {
      if (e.shiftKey) {
        logseq.Editor.openInRightSidebar(page.uuid)
      } else {
        gotoBlock(
          block.name != null && block.children[0]
            ? block.children[0].uuid
            : block.uuid,
          block.name != null && block.children[0] ? block.id : block.parentID,
        )
      }
    },
    [page, block],
  )

  const goInto = useCallback(
    (e) => {
      if (e.shiftKey) {
        logseq.Editor.openInRightSidebar(block.uuid)
      } else {
        if (block.name) {
          logseq.Editor.scrollToBlockInPage(block.name)
        } else {
          logseq.Editor.scrollToBlockInPage(block.uuid)
        }
      }
    },
    [block],
  )

  const toggleCollapsed = useCallback((e) => {
    if (e.altKey) {
      setData((data) =>
        produce(data, (root) => {
          const node = fromPath(root, path)
          setCollapsed(node, !node.collapsed)
        }),
      )
    } else {
      setData((data) =>
        produce(data, (root) => {
          const node = fromPath(root, path)
          node.collapsed = !node.collapsed
        }),
      )
    }
  }, [])

  const toggleCollapseChildren = useCallback(() => {
    setData((data) =>
      produce(data, (root) => {
        const node = fromPath(root, path)
        if (
          node.children.some(
            (child) => child.children.length > 0 && child.collapsed,
          )
        ) {
          for (const child of node.children) {
            child.collapsed = false
          }
        } else {
          for (const child of node.children) {
            child.collapsed = true
          }
        }
      }),
    )
  }, [])

  function onDragStart(e) {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", block.uuid)

    const clone = e.target.cloneNode(true)
    clone.id = "kef-tocgen-drag-shadow"
    clone.style.width = "fit-content"
    clone.style.background = "#fff"
    clone.style.transform = "translateZ(-99999px)"
    parent.document.body.appendChild(clone)
    e.dataTransfer.setDragImage(clone, 0, 0)

    const appContainer = parent.document.getElementById("app-container")
    appContainer.classList.add("kef-tocgen-dragging")
  }

  function onDragEnter(e) {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    e.target.style.borderTopColor = "var(--ls-alink-color)"
  }

  function onDragLeave(e) {
    e.stopPropagation()
    e.preventDefault()
    e.target.style.borderTopColor = ""
  }

  async function onDrop(e) {
    e.stopPropagation()
    e.preventDefault()
    e.target.style.borderTopColor = ""
    const srcUUID = e.dataTransfer.getData("text/plain")
    const destUUID = e.target.dataset.uuid
    if (srcUUID === destUUID) return
    if (e.target.classList.contains("kef-tocgen-drag-childholder")) {
      await logseq.Editor.moveBlock(srcUUID, destUUID, { children: true })
      await refetchData()
    } else if (e.target.classList.contains("kef-tocgen-drag-bottomholder")) {
      await logseq.Editor.moveBlock(srcUUID, destUUID)
      await refetchData()
    } else {
      await logseq.Editor.moveBlock(srcUUID, destUUID, { before: true })
      await refetchData()
    }
  }

  function onDragEnd(e) {
    e.stopPropagation()
    e.preventDefault()

    const appContainer = parent.document.getElementById("app-container")
    appContainer.classList.remove("kef-tocgen-dragging")

    const shadowEl = parent.document.getElementById("kef-tocgen-drag-shadow")
    shadowEl.remove()
  }

  return (
    <div
      class="kef-tocgen-block-container"
      onMouseDown={(e) => {
        // HACK: prevent dragdrop being prevented because of ancestor's
        // `preventDefault()` call.
        e.stopPropagation()
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        class={cls(
          "kef-tocgen-block",
          blocksToHighlight?.has(block.id) && "kef-tocgen-active-block",
        )}
        data-uuid={block.embeddingUUID ?? block.uuid}
        data-level={path.length}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            class={block.children.length === 0 && "kef-tocgen-arrow-hidden"}
            style={{
              transform: block.collapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <div>
          <span
            class="kef-tocgen-into inline"
            data-ref={block.uuid}
            onClick={goInto}
            dangerouslySetInnerHTML={{ __html: block.content }}
          ></span>
          {!logseq.settings?.noPageJump && (
            <button class="kef-tocgen-to" onClick={goTo}>
              &#xea0c;
            </button>
          )}
        </div>
      </div>
      <div
        class="kef-tocgen-drag-childholder"
        data-uuid={block.uuid}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
      {!block.collapsed && block.children.length > 0 && (
        <>
          <div class="kef-tocgen-block-children">
            <div
              className="kef-tocgen-block-collapse"
              onClick={toggleCollapseChildren}
            />
            {block.children.map((subBlock, i) => (
              <Block
                key={subBlock.id}
                block={subBlock}
                page={page}
                blocksToHighlight={blocksToHighlight}
                path={[...path, i]}
                setData={setData}
                refetchData={refetchData}
              />
            ))}
            <div
              class="kef-tocgen-drag-bottomholder"
              data-uuid={
                block.children[block.children.length - 1].embeddingUUID ??
                block.children[block.children.length - 1].uuid
              }
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          </div>
        </>
      )}
    </div>
  )
}

function fromPath(root, path) {
  let ret = root
  for (const index of path) {
    ret = ret.children[index]
  }
  return ret
}

function setCollapsed(node, value) {
  node.collapsed = value
  for (const child of node.children) {
    setCollapsed(child, value)
  }
}
