import { useContext, useEffect, useState } from "preact/hooks"
import { parseContent } from "../utils.js"
import Block from "./Block.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function TocGen({ root, blocks, levels, headingType }) {
  const { lang } = useContext(ConfigContext)
  const [rootName, setRootName] = useState(
    root.page == null ? root.originalName ?? root.name : "",
  )

  useEffect(() => {
    if (root.page != null) {
      ;(async () => {
        setRootName(await parseContent(root.content))
      })()
    } else {
      setRootName(root.originalName ?? root.name)
    }
  }, [root])

  function gotoPage() {
    if (root.page == null) {
      logseq.Editor.scrollToBlockInPage(root.name)
    } else {
      logseq.Editor.scrollToBlockInPage(root.uuid)
    }
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
      <div class="kef-tocgen-page" onClick={gotoPage}>
        {rootName}
      </div>
      {blocks.map((block) => (
        <Block
          key={block.id}
          root={root}
          block={block}
          levels={levels}
          headingType={headingType}
        />
      ))}
    </>
  )
}
