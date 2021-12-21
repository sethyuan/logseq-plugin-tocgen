import { useContext } from "preact/hooks"
import Block from "./Block.jsx"
import { ConfigContext } from "./ConfigProvider.jsx"

export default function TocGen({ page, blocks, levels }) {
  const { lang } = useContext(ConfigContext)

  function gotoPage() {
    logseq.Editor.scrollToBlockInPage(page.name)
  }

  if (blocks == null) {
    return (
      <div style={{ color: "#f00" }}>
        {lang === "zh-CN" ? "页面不存在！" : "Page not found!"}
      </div>
    )
  }

  return (
    <>
      <div class="kef-tocgen-page" onClick={gotoPage}>
        {page.name}
      </div>
      {blocks.map((block) => (
        <Block key={block.id} page={page} block={block} levels={levels} />
      ))}
    </>
  )
}
