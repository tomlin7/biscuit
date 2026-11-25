import type { ExtensionManifest } from "./ExtensionsContext";

export type ExtraTheme = {
  id: string;
  label: string;
  mode: "light" | "dark";
  colors: { bg: string; fg: string; accent: string };
};

export type ExtraLanguage = {
  id: string;
  aliases: string[];
  extensions: string[];
};

let languages: ExtraLanguage[] = [];

const registeredLanguages = new Set<string>();

export function setExtraLanguages(next: ExtraLanguage[]) {
  languages = next;
}

export function registerExtraLanguages(
  next: ExtraLanguage[],
  register: (language: ExtraLanguage) => void,
) {
  setExtraLanguages(next);
  for (const language of next) {
    if (registeredLanguages.has(language.id)) continue;
    registeredLanguages.add(language.id);
    register(language);
  }
}

export function extraLanguageFor(path: string): string | null {
  const name = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = name.slice(dot);
  for (const language of languages) {
    const match = language.extensions.some((item) => {
      const normalized = item.toLowerCase();
      return normalized === ext || normalized === ext.slice(1);
    });
    if (match) return language.id;
  }
  return null;
}

export function collectContributions(extensions: ExtensionManifest[]): {
  themes: ExtraTheme[];
  languages: ExtraLanguage[];
} {
  const themes: ExtraTheme[] = [];
  const nextLanguages: ExtraLanguage[] = [];
  for (const ext of extensions) {
    if (!ext.enabled) continue;
    for (const theme of ext.contributes?.themes ?? []) {
      if (!theme.id) continue;
      themes.push({
        id: theme.id,
        label: theme.label || theme.id,
        mode: theme.mode === "light" ? "light" : "dark",
        colors: {
          bg: theme.colors?.bg ?? "",
          fg: theme.colors?.fg ?? "",
          accent: theme.colors?.accent ?? "",
        },
      });
    }
    for (const language of ext.contributes?.languages ?? []) {
      if (!language.id) continue;
      nextLanguages.push({
        id: language.id,
        aliases: language.aliases ?? [],
        extensions: language.extensions ?? [],
      });
    }
  }
  return { themes, languages: nextLanguages };
}
