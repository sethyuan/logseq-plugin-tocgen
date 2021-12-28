import { marked } from "marked"

const renderer = {
  // Block level renderers.
  code: () => "",
  blockquote: (quote) => quote,
  html: (html) => html,
  heading: (text, _level, _raw) => text,
  hr: () => "",
  list: () => "",
  listitem: () => "",
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
  text: (text) => text,
}

marked.use({ renderer })

export const parse = marked.parse
