import { createContext } from "preact"
import { useMemo } from "preact/hooks"

export const ConfigContext = createContext({ lang: "en" })

export default function ConfigProvider({ lang, children }) {
  const value = useMemo(() => ({ lang }), [lang])

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  )
}
