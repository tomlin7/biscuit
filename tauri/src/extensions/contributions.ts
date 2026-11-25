import type { ExtensionManifest } from "./ExtensionsContext";
import type { IconThemeDefinition } from "../theme/iconTheme/types";

export type ExtraIconTheme = IconThemeDefinition;

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

export type ExtraWebview = {
  extensionId: string;
  id: string;
  title: string;
  entry: string;
};

export type ExtraSidebarView = {
  extensionId: string;
  id: string;
  name: string;
  icon?: string;
  entry?: string;
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
  webviews: ExtraWebview[];
  sidebarViews: ExtraSidebarView[];
  iconThemes: ExtraIconTheme[];
} {
  const themes: ExtraTheme[] = [];
  const nextLanguages: ExtraLanguage[] = [];
  const webviews: ExtraWebview[] = [];
  const sidebarViews: ExtraSidebarView[] = [];
  const iconThemes: ExtraIconTheme[] = [];
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
    for (const webview of ext.contributes?.webviews ?? []) {
      if (!webview.id) continue;
      webviews.push({
        extensionId: ext.id,
        id: webview.id,
        title: webview.title || webview.id,
        entry: webview.entry,
      });
    }
    for (const view of ext.contributes?.views ?? []) {
      if (!view.id) continue;
      sidebarViews.push({
        extensionId: ext.id,
        id: view.id,
        name: view.name || view.id,
        icon: view.icon,
        entry: view.entry,
      });
    }
    for (const it of ext.contributes?.iconThemes ?? []) {
      if (!it.id) continue;
      const themeId = it.id.startsWith("ext:") ? it.id : `ext:${it.id}`;
      iconThemes.push({
        id: themeId,
        label: it.label || it.id,
        description: it.description,
        defaultFile: it.defaultFile,
        defaultFolder: it.defaultFolder,
        defaultFolderOpen: it.defaultFolderOpen,
        fileExtensions: it.fileExtensions,
        fileNames: it.fileNames,
        folderNames: it.folderNames,
        folderNamesOpen: it.folderNamesOpen,
        icons: it.icons,
      });
    }
  }
  return { themes, languages: nextLanguages, webviews, sidebarViews, iconThemes };
}
