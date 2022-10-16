import alias from "@rollup/plugin-alias"
import html from "@rollup/plugin-html"
import json from "@rollup/plugin-json"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import replace from "@rollup/plugin-replace"
import { readFile } from "fs/promises"
import { defineRollupSwcOption, swc } from "rollup-plugin-swc3"

export default {
  input: "src/index.jsx",
  output: {
    dir: "dist",
    entryFileNames: "[name].[hash].js",
  },
  plugins: [
    alias({
      entries: [
        { find: "react", replacement: "preact/compat" },
        { find: "react-dom", replacement: "preact/compat" },
      ],
    }),
    html({
      fileName: "index.html",
      template: async ({ files }) => {
        const content = await readFile("src/index.html", { encoding: "utf8" })
        const fileName = files.js.find(({ name }) => name === "index").fileName
        return content
          .replace(
            "{preload}",
            `<link rel="modulepreload" as="script" href="${fileName}" />`,
          )
          .replace("{js}", `<script type="module" src="${fileName}"></script>`)
      },
    }),
    nodeResolve(),
    json(),
    swc(
      defineRollupSwcOption({
        jsc: {
          target: "es2021",
          transform: {
            react: {
              pragma: "h",
              pragmaFrag: "Fragment",
              importSource: "preact",
              runtime: "automatic",
            },
          },
        },
      }),
    ),
    replace({
      preventAssignment: true,
      values: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
    }),
  ],
}
