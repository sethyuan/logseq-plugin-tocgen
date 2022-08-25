import { marked } from "marked"

const footnoteRegex = /\[\^[^\]]*\]/g
const highlightRegex = /==([^=]*)==|\^\^([^\^]*)\^\^/g

function htmlDecode(str) {
  if (str.length === 0) {
    return ""
  }

  return str.replace(
    /&(#[0-9]*|amp|lt|gt|nbsp|quot|copy|trade);/g,
    (_, code) => {
      switch (code) {
        case "amp":
          return "&"
        case "lt":
          return "<"
        case "gt":
          return ">"
        case "nbsp":
          return " "
        case "quot":
          return '"'
        case "copy":
          return "©"
        case "trade":
          return "™"
        default:
          return String.fromCharCode(code.substring(1))
      }
    },
  )
}

const renderer = {
  // Block level renderers.
  code: (code) => code,
  blockquote: (quote) => quote,
  html: (html) => html,
  heading: (text, level, raw) => text,
  hr: () => "",
  list: (body, ordered, start) => `${ordered ? `${start}. ` : ""}${body}`,
  listitem: (text) => text,
  checkbox: () => "",
  paragraph: (text) => text,
  table: () => "",
  tablerow: () => "",
  tablecell: () => "",

  // Inline level renderers.
  strong: (text) => text,
  em: (text) => text,
  codespan: (code) => code,
  br: () => "",
  del: (text) => text,
  link: (href, title, text) => text,
  image: (href, title, text) => text,
  text: (text) =>
    text.startsWith("[^") && text.endsWith("]") ? "" : htmlDecode(text),
}

const tokenizer = {
  inlineText(src) {
    if (footnoteRegex.test(src)) {
      const text = src.replace(footnoteRegex, "")
      return {
        type: "text",
        raw: src,
        text,
      }
    }
    return false
  },
  emStrong(src) {
    if (highlightRegex.test(src)) {
      const text = src.replace(highlightRegex, "$1$2")
      return {
        type: "em",
        raw: src,
        text,
        tokens: this.lexer.inlineTokens(text, []),
      }
    }
    return false
  },
}

marked.use({ renderer, tokenizer })

export const parse = marked.parse
