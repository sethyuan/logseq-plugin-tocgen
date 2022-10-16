import ExpandAllIcon from "./ExpandAllIcon"

export default function CollapseAllIcon({ style, ...attrs }) {
  return (
    <ExpandAllIcon
      {...attrs}
      style={{ transform: "rotate(180deg) translateY(2px)", ...style }}
    />
  )
}
