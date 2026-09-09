"use client";

import { useEffect } from "react";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { getSedeById } from "@/lib/sedes";
import { hexToHslComponents } from "@/lib/sede-theme";

const VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--canvas",
] as const;

const DEFAULTS: Record<(typeof VARS)[number], string> = {
  "--primary": "217.2 91.2% 59.8%",
  "--ring": "217.2 91.2% 59.8%",
  "--sidebar-primary": "217.2 91.2% 59.8%",
  "--sidebar-ring": "217.2 91.2% 59.8%",
  "--canvas": "210 40% 98%",
};

const DEFAULTS_DARK: Record<(typeof VARS)[number], string> = {
  ...DEFAULTS,
  "--canvas": "222.2 47.4% 6%",
};

/** Aplica el acento de color de la sede activa a la interfaz */
const SedeThemeEffect: React.FC = () => {
  const { sedeActiva } = useSedeActiva();

  useEffect(() => {
    const root = document.documentElement;
    const sede = sedeActiva ? getSedeById(sedeActiva) : undefined;
    const isDark = root.classList.contains("dark");
    const defaults = isDark ? DEFAULTS_DARK : DEFAULTS;

    const applyTheme = () => {
      const dark = root.classList.contains("dark");
      const base = dark ? DEFAULTS_DARK : DEFAULTS;

      if (sede) {
        const hsl = hexToHslComponents(sede.color);
        const [h] = hsl.split(" ");
        VARS.forEach((name) => {
          if (name === "--canvas") {
            root.style.setProperty(name, dark ? `${h} 28% 8%` : `${h} 45% 97%`);
          } else {
            root.style.setProperty(name, hsl);
          }
        });
        root.dataset.sedeActiva = sede.id;
      } else {
        VARS.forEach((name) => root.style.setProperty(name, base[name]));
        delete root.dataset.sedeActiva;
      }
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      VARS.forEach((name) => root.style.setProperty(name, defaults[name]));
      delete root.dataset.sedeActiva;
    };
  }, [sedeActiva]);

  return null;
};

export default SedeThemeEffect;
