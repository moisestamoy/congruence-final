import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system" | "accion" | "ocean" | "sakura"

// Dynamically generates an SVG favicon matching the current theme accent color
function setFavicon(color: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="112" fill="#000000"/>
        <circle cx="256" cy="256" r="204.8" stroke="${color}" stroke-width="14" stroke-opacity="0.25" fill="none"/>
        <circle cx="256" cy="256" r="153.6" stroke="${color}" stroke-width="17" stroke-opacity="0.60" fill="none"/>
        <circle cx="256" cy="256" r="102.4" stroke="${color}" stroke-width="20" stroke-opacity="1"    fill="none"/>
        <circle cx="256" cy="256" r="17.6"  fill="${color}"/>
    </svg>`
    const href = `data:image/svg+xml,${encodeURIComponent(svg)}`
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
        link = document.createElement("link")
        link.rel = "icon"
        document.head.appendChild(link)
    }
    link.type = "image/svg+xml"
    link.href = href
}

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "dark",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    storageKey = "lifeos-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark", "accion", "ocean", "sakura")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
            root.classList.add(systemTheme)
            setFavicon("#22d3ee")
            return
        }

        if (theme === "accion") {
            root.classList.add("dark"); root.classList.add("accion")
            setFavicon("#ef4444")
            return
        }
        if (theme === "ocean") {
            root.classList.add("dark"); root.classList.add("ocean")
            setFavicon("#818cf8")
            return
        }
        if (theme === "sakura") {
            root.classList.add("dark"); root.classList.add("sakura")
            setFavicon("#e879f9")
            return
        }

        root.classList.add(theme)
        setFavicon("#22d3ee")
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")
    return context
}
