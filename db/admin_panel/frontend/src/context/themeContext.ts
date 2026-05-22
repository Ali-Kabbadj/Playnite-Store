import type { Theme } from "@/types";
import { createContext } from "react";


export const ThemeContext = createContext<{
    theme: Theme;
    toggleTheme: () => void;
} | null>(null);