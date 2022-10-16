import produce from "immer"
import { t } from "logseq-l10n"
import { useCallback } from "preact/hooks"
import { cls } from "reactutils"
import Arrow from "./Arrow.jsx"

export default function Block({
  block,
  page,
  blocksToHighlight,
  path,
  setData,
}) {
  const goTo = useCallback(
    (e) => {
      if (e.shiftKey) {
        logseq.Editor.openInRightSidebar(page.uuid)
      } else {
        logseq.Editor.scrollToBlockInPage(
          page.name,
          block.name != null && block.children[0]
            ? block.children[0].uuid
            : block.uuid,
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

  const toggleCollapsed = useCallback(() => {
    setData((data) =>
      produce(data, (root) => {
        const node = fromPath(root, path)
        node.collapsed = !node.collapsed
      }),
    )
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
              {t("page")}
            </button>
          )}
        </div>
      </div>
      {!block.collapsed && block.children.length > 0 && (
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
            />
          ))}
        </div>
      )}
    </>
  )
}

function fromPath(root, path) {
  let ret = root
  for (const index of path) {
    ret = ret.children[index]
  }
  return ret
}
