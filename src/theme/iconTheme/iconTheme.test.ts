import { describe, expect, it } from "bun:test";
import {
  BUILTIN_ICON_THEMES,
  CLASSIC_THEME,
  MATERIAL_THEME,
  MINIMAL_MONO_THEME,
  NONE_THEME,
  SETI_THEME,
} from "./builtins";
import { resolveIcon } from "./resolver";
import type { IconThemeDefinition } from "./types";
import { COMMANDS } from "../../commands/registry";
import { collectContributions } from "../../extensions/contributions";

describe("built-in icon themes", () => {
  it("includes all standard built-in themes", () => {
    const ids = BUILTIN_ICON_THEMES.map((t) => t.id);
    expect(ids).toContain("material");
    expect(ids).toContain("seti");
    expect(ids).toContain("minimal-mono");
    expect(ids).toContain("classic");
    expect(ids).toContain("none");
  });

  it("provides valid labels and descriptions for all built-in themes", () => {
    for (const theme of BUILTIN_ICON_THEMES) {
      expect(theme.id).toBeTruthy();
      expect(theme.label).toBeTruthy();
      expect(theme.description).toBeTruthy();
    }
  });
});

describe("icon resolution - Material theme", () => {
  it("resolves file extensions correctly", () => {
    const tsIcon = resolveIcon(MATERIAL_THEME, "index.ts", "file");
    expect(tsIcon.color).toBe("#3178c6");
    expect(tsIcon.svg).toBeDefined();

    const tsxIcon = resolveIcon(MATERIAL_THEME, "App.tsx", "file");
    expect(tsxIcon.color).toBe("#61dafb");

    const pyIcon = resolveIcon(MATERIAL_THEME, "script.py", "file");
    expect(pyIcon.color).toBe("#3776ab");

    const rsIcon = resolveIcon(MATERIAL_THEME, "main.rs", "file");
    expect(rsIcon.color).toBe("#f74c00");

    const jsonIcon = resolveIcon(MATERIAL_THEME, "data.json", "file");
    expect(jsonIcon.color).toBe("#f59e0b");

    const mdIcon = resolveIcon(MATERIAL_THEME, "README.md", "file");
    expect(mdIcon.color).toBe("#42a5f5");

    const htmlIcon = resolveIcon(MATERIAL_THEME, "index.html", "file");
    expect(htmlIcon.color).toBe("#e34f26");

    const cssIcon = resolveIcon(MATERIAL_THEME, "styles.css", "file");
    expect(cssIcon.color).toBe("#264de4");

    const sqlIcon = resolveIcon(MATERIAL_THEME, "schema.sql", "file");
    expect(sqlIcon.color).toBe("#00758f");

    const pdfIcon = resolveIcon(MATERIAL_THEME, "document.pdf", "file");
    expect(pdfIcon.color).toBe("#ef4444");
  });

  it("resolves specific file names by priority over extension", () => {
    const pkg = resolveIcon(MATERIAL_THEME, "package.json", "file");
    expect(pkg.color).toBe("#cb3837");

    const cargo = resolveIcon(MATERIAL_THEME, "Cargo.toml", "file");
    expect(cargo.color).toBe("#f74c00");

    const gitignore = resolveIcon(MATERIAL_THEME, ".gitignore", "file");
    expect(gitignore.color).toBe("#f05032");

    const docker = resolveIcon(MATERIAL_THEME, "Dockerfile", "file");
    expect(docker.color).toBe("#2496ed");
  });

  it("resolves folders both closed and open", () => {
    const srcClosed = resolveIcon(MATERIAL_THEME, "src", "directory", false);
    const srcOpen = resolveIcon(MATERIAL_THEME, "src", "directory", true);
    expect(srcClosed.color).toBe("#3b82f6");
    expect(srcOpen.color).toBe("#3b82f6");
    expect(srcClosed.svg).not.toBe(srcOpen.svg);

    const nodeModules = resolveIcon(MATERIAL_THEME, "node_modules", "directory", false);
    expect(nodeModules.color).toBe("#8b5cf6");

    const gitFolder = resolveIcon(MATERIAL_THEME, ".git", "directory", false);
    expect(gitFolder.color).toBe("#f05032");

    const generalClosed = resolveIcon(MATERIAL_THEME, "my-random-folder", "directory", false);
    const generalOpen = resolveIcon(MATERIAL_THEME, "my-random-folder", "directory", true);
    expect(generalClosed.color).toBe("#dcb67a");
    expect(generalOpen.color).toBe("#dcb67a");
  });

  it("falls back to default file icon for unknown extensions", () => {
    const unknown = resolveIcon(MATERIAL_THEME, "file.xyz999", "file");
    expect(unknown.svg).toBeDefined();
    expect(unknown.color).toBe("#94a3b8");
  });
});

describe("icon resolution - Seti theme", () => {
  it("resolves Seti palette colors", () => {
    const ts = resolveIcon(SETI_THEME, "main.ts", "file");
    expect(ts.color).toBe("#519aba");

    const js = resolveIcon(SETI_THEME, "app.js", "file");
    expect(js.color).toBe("#cbcb41");

    const rust = resolveIcon(SETI_THEME, "lib.rs", "file");
    expect(rust.color).toBe("#dea584");

    const folder = resolveIcon(SETI_THEME, "src", "directory", false);
    expect(folder.color).toBe("#519aba");
  });
});

describe("icon resolution - Minimal Mono theme", () => {
  it("uses monochromatic colors across file types and folders", () => {
    const ts = resolveIcon(MINIMAL_MONO_THEME, "index.ts", "file");
    const py = resolveIcon(MINIMAL_MONO_THEME, "script.py", "file");
    const folder = resolveIcon(MINIMAL_MONO_THEME, "src", "directory", false);

    expect(ts.color).toBe("#94a3b8");
    expect(py.color).toBe("#94a3b8");
    expect(folder.color).toBe("#94a3b8");
  });
});

describe("icon resolution - Classic and None themes", () => {
  it("returns isBadge for classic theme", () => {
    const res = resolveIcon(CLASSIC_THEME, "main.ts", "file");
    expect(res.isBadge).toBe(true);
  });

  it("returns isNone for none theme", () => {
    const fileRes = resolveIcon(NONE_THEME, "main.ts", "file");
    expect(fileRes.isNone).toBe(true);

    const dirRes = resolveIcon(NONE_THEME, "src", "directory", false);
    expect(dirRes.isNone).toBe(true);
  });
});

describe("installable / contributed custom icon themes", () => {
  const customTheme: IconThemeDefinition = {
    id: "custom-neon",
    label: "Custom Neon Theme",
    defaultFile: { svg: '<path d="M0 0h24v24H0z"/>', color: "#ff00ff" },
    defaultFolder: { svg: '<path d="M1 1h22v22H1z"/>', color: "#00ffff" },
    defaultFolderOpen: { svg: '<path d="M2 2h20v20H2z"/>', color: "#00ff00" },
    icons: {
      tsIcon: { svg: '<path d="M3 3h18v18H3z"/>', color: "#3178c6" },
      glow: { svg: '<circle cx="12" cy="12" r="10"/>', color: "#ffff00" },
    },
    fileExtensions: {
      ts: "tsIcon",
      neon: "glow",
    },
    fileNames: {
      "neon.config.json": { color: "#ff0080", svg: '<rect width="10" height="10"/>' },
    },
    folderNames: {
      special: { color: "#ffaa00", svg: '<polygon points="0,0 10,10 0,20"/>' },
    },
  };

  it("resolves custom file extensions using shared dictionary", () => {
    const ts = resolveIcon(customTheme, "test.ts", "file");
    expect(ts.color).toBe("#3178c6");
    expect(ts.svg).toContain("M3 3h18v18H3z");

    const neon = resolveIcon(customTheme, "light.neon", "file");
    expect(neon.color).toBe("#ffff00");
  });

  it("resolves custom exact file names", () => {
    const cfg = resolveIcon(customTheme, "neon.config.json", "file");
    expect(cfg.color).toBe("#ff0080");
  });

  it("resolves custom folder names and default fallbacks", () => {
    const special = resolveIcon(customTheme, "special", "directory", false);
    expect(special.color).toBe("#ffaa00");

    const fallbackClosed = resolveIcon(customTheme, "other", "directory", false);
    expect(fallbackClosed.color).toBe("#00ffff");

    const fallbackOpen = resolveIcon(customTheme, "other", "directory", true);
    expect(fallbackOpen.color).toBe("#00ff00");
  });

  it("collects icon themes contributed by extensions", () => {
    const sampleExtension = {
      id: "sample.icon-pack",
      name: "Sample Icon Pack",
      version: "1.0.0",
      description: "Icon pack extension",
      enabled: true,
      path: "/extensions/sample",
      contributes: {
        iconThemes: [
          {
            id: "sample-icons",
            label: "Sample Icons",
            description: "Sample icons contributed by extension",
            fileExtensions: {
              foo: { color: "#123456", svg: '<path d="M0 0"/>' },
            },
          },
        ],
      },
    };

    const contributions = collectContributions([sampleExtension]);
    expect(contributions.iconThemes).toHaveLength(1);
    expect(contributions.iconThemes[0].id).toBe("ext:sample-icons");
    expect(contributions.iconThemes[0].label).toBe("Sample Icons");

    const resolved = resolveIcon(contributions.iconThemes[0], "test.foo", "file");
    expect(resolved.color).toBe("#123456");
  });
});

describe("command palette registration", () => {
  it("registers workbench.action.selectIconTheme in COMMANDS registry", () => {
    const cmd = COMMANDS.find((c) => c.id === "workbench.action.selectIconTheme");
    expect(cmd).toBeDefined();
    expect(cmd?.title).toBe("Preferences: File Icon Theme");
    expect(cmd?.category).toBe("Preferences");
    expect(typeof cmd?.run).toBe("function");
  });
});
