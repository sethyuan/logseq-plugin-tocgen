import { useContext, useEffect, useMemo, useState } from "preact/hooks"
import { parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"
import Block from "./Block.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function TocGen({ root, blocks, levels, headingType }) {
  const { lang } = useContext(ConfigContext)
  const [name, setName] = useState(() =>
    root.page == null ? root.originalName ?? root.name : "",
  )
  const [collapsed, setCollapsed] = useState(false)
  const pageName = useMemo(async () => {
    if (root.page) {
      return (await logseq.Editor.getPage(root.page.id)).name
    } else {
      return root.name
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

  function goTo() {
    if (root.page == null) {
      logseq.Editor.scrollToBlockInPage(root.name)
    } else {
      logseq.Editor.scrollToBlockInPage(root.uuid)
    }
  }

  async function goToPage() {
    logseq.Editor.scrollToBlockInPage(await pageName, root.uuid)
  }

  function toggleCollapsed() {
    setCollapsed((v) => !v)
  }

  if (blocks == null) {
    return (
      <div style={{ color: "#f00" }}>
        {lang === "zh-CN" ? "页面/块不存在！" : "Page/Block not found!"}
      </div>
    )
  }

  return (
    <>
      <div class="kef-tocgen-page">
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            style={{
              transform: collapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <span className="inline" onClick={goTo}>
          {name}
        </span>
        {root.page != null && (
          <button class="kef-tocgen-to" onClick={goToPage}>
            {lang === "zh-CN" ? "页面" : "page"}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="kef-tocgen-block-children">
          {blocks.map((block) => (
            <Block
              key={block.id}
              root={root}
              block={block}
              levels={levels}
              headingType={headingType}
            />
          ))}
        </div>
      )}
    </>
  )
}
