import { cls } from "reactutils"

export default function EditIcon({ class: className, style, onClick }) {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      viewBox="0 0 24 24"
      class={cls("kef-tocgen-icon-edit", className)}
      style={{ display: "inline", ...style }}
      onClick={onClick}
    >
      <path
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      ></path>
    </svg>
  )
}
