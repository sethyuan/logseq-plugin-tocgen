import { cls } from "reactutils"

export default function ExpandAllIcon({ class: className, style, onClick }) {
  return (
    <svg
      t="1665833282119"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="7291"
      fill="currentColor"
      class={cls("kef-tocgen-icon-expand", className)}
      style={{ display: "inline", ...style }}
      onClick={onClick}
    >
      <path
        d="M194.72 204.8l44.096-44.768 308.576 313.12-44.064 44.768zM194.72 521.216l44-44.864 308.576 313.12-44.064 44.768z"
        p-id="7292"
      ></path>
      <path
        d="M767.616 160.064l44.096 44.768-308.608 313.12-44.064-44.768zM767.648 476.48l44.032 44.736-308.576 313.12-44.096-44.768z"
        p-id="7293"
      ></path>
    </svg>
  )
}
