import type { Monaco } from "@monaco-editor/react";
import type { JsonSchemaAssociation } from "../settings/SettingsContext";

export const BUILTIN_JSON_SCHEMAS: JsonSchemaAssociation[] = [
  {
    uri: "vscode://schemas/package.json",
    fileMatch: ["*package.json"],
    schema: {
      type: "object",
      title: "Package.json Schema",
      description: "npm / Bun package configuration",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "The name of the package.",
        },
        version: {
          type: "string",
          description: "Version must be parseable by node-semver.",
        },
        description: {
          type: "string",
          description: "This helps people discover your package, as it's listed in 'npm search'.",
        },
        main: {
          type: "string",
          description: "The main entry point to your program.",
        },
        module: {
          type: "string",
          description: "An ECMAScript module ID of the module.",
        },
        types: {
          type: "string",
          description: "Location of the declaration file that specifies the types for this package.",
        },
        typings: {
          type: "string",
          description: "Alias for types.",
        },
        type: {
          type: "string",
          enum: ["commonjs", "module"],
          description: "When set to 'module', the type field allows a package to specify that all .js files are ES modules.",
        },
        scripts: {
          type: "object",
          description: "A dictionary of commands that can be run with 'npm run' or 'bun run'.",
          additionalProperties: { type: "string" },
        },
        dependencies: {
          type: "object",
          description: "Dependencies are specified in a simple object that maps a package name to a version range.",
          additionalProperties: { type: "string" },
        },
        devDependencies: {
          type: "object",
          description: "Dependencies that are only needed during development.",
          additionalProperties: { type: "string" },
        },
        peerDependencies: {
          type: "object",
          description: "Dependencies that your package is compatible with.",
          additionalProperties: { type: "string" },
        },
        repository: {
          description: "Specify the place where your code lives.",
          oneOf: [{ type: "string" }, { type: "object" }],
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "This helps people discover your package as it's listed in 'npm search'.",
        },
        author: {
          description: "The author of the package.",
          oneOf: [{ type: "string" }, { type: "object" }],
        },
        license: {
          type: "string",
          description: "You should specify a license for your package so that people know how they are permitted to use it.",
        },
        private: {
          type: "boolean",
          description: "If set to true, npm will refuse to publish it.",
        },
        engines: {
          type: "object",
          description: "You can specify the version of node that your stuff works on.",
          additionalProperties: { type: "string" },
        },
        workspaces: {
          type: "array",
          items: { type: "string" },
          description: "Array of workspace directory patterns.",
        },
      },
    },
  },
  {
    uri: "vscode://schemas/tsconfig.json",
    fileMatch: ["*tsconfig.json", "*tsconfig.*.json", "*jsconfig.json"],
    schema: {
      type: "object",
      title: "TSConfig / JSConfig Schema",
      description: "TypeScript and JavaScript compiler options configuration",
      properties: {
        compilerOptions: {
          type: "object",
          description: "Instructs the TypeScript compiler how to compile .ts files.",
          properties: {
            target: {
              type: "string",
              description: "Set the JavaScript language version for emitted JavaScript.",
            },
            module: {
              type: "string",
              description: "Specify what module code is generated.",
            },
            lib: {
              type: "array",
              items: { type: "string" },
              description: "Specify a set of bundled library declaration files that describe the target runtime environment.",
            },
            jsx: {
              type: "string",
              enum: ["preserve", "react", "react-jsx", "react-jsxdev", "react-native"],
              description: "Specify what JSX code is generated.",
            },
            strict: {
              type: "boolean",
              description: "Enable all strict type-checking options.",
            },
            noImplicitAny: {
              type: "boolean",
              description: "Enable error reporting for expressions and declarations with an implied any type.",
            },
            moduleResolution: {
              type: "string",
              description: "Specify how TypeScript looks up a file from a given module specifier.",
            },
            baseUrl: {
              type: "string",
              description: "Specify the base directory to resolve non-relative module names.",
            },
            paths: {
              type: "object",
              description: "Specify a set of entries that re-map imports to additional lookup locations.",
            },
            outDir: {
              type: "string",
              description: "Specify an output folder for all emitted files.",
            },
            rootDir: {
              type: "string",
              description: "Specify the root folder within your source files.",
            },
            skipLibCheck: {
              type: "boolean",
              description: "Skip type checking .d.ts files.",
            },
            esModuleInterop: {
              type: "boolean",
              description: "Emit additional JavaScript to ease support for importing CommonJS modules.",
            },
          },
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "Specifies an array of filenames or patterns to include in the program.",
        },
        exclude: {
          type: "array",
          items: { type: "string" },
          description: "Specifies an array of filenames or patterns that should be skipped when resolving include.",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Specifies an allowlist of files to include in the program.",
        },
        extends: {
          type: "string",
          description: "Path to base configuration file to inherit from.",
        },
      },
    },
  },
  {
    uri: "https://schema.tauri.app/config/2",
    fileMatch: ["*tauri.conf.json"],
    schema: {
      type: "object",
      title: "Tauri 2 Configuration",
      description: "Tauri desktop application manifest",
      properties: {
        $schema: { type: "string" },
        productName: { type: "string", description: "The application name." },
        version: { type: "string", description: "The application version." },
        identifier: { type: "string", description: "The application bundle identifier (e.g. com.app.id)." },
        build: {
          type: "object",
          properties: {
            beforeDevCommand: { type: "string" },
            devUrl: { type: "string" },
            beforeBuildCommand: { type: "string" },
            frontendDist: { type: "string" },
          },
        },
        app: { type: "object" },
        bundle: { type: "object" },
        plugins: { type: "object" },
      },
    },
  },
  {
    uri: "t3d://schemas/extension.json",
    fileMatch: ["*extension.json", "*manifest.json", "*t3d.manifest.json"],
    schema: {
      type: "object",
      title: "T3D Extension Manifest",
      description: "T3D extension contribution and metadata manifest",
      required: ["id", "name", "version"],
      properties: {
        id: { type: "string", description: "Unique identifier for the extension." },
        name: { type: "string", description: "Human-readable extension name." },
        version: { type: "string", description: "SemVer extension version." },
        description: { type: "string", description: "Brief summary of what the extension provides." },
        publisher: { type: "string", description: "Publisher name or handle." },
        main: { type: "string", description: "Entry script executed in extension host." },
        ui: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["sidebar", "webview", "statusbar"] },
            title: { type: "string" },
            icon: { type: "string" },
          },
        },
        contributes: {
          type: "object",
          properties: {
            themes: { type: "array" },
            languages: { type: "array" },
            commands: { type: "array" },
            webviews: { type: "array" },
          },
        },
        permissions: {
          type: "array",
          items: { type: "string" },
          description: "Declared extension capabilities.",
        },
      },
    },
  },
  {
    uri: "t3d://schemas/settings.json",
    fileMatch: ["*.t3d/settings.json", "*settings.json"],
    schema: {
      type: "object",
      title: "T3D Settings Schema",
      description: "User and workspace configuration settings for T3D",
      properties: {
        editor: {
          type: "object",
          properties: {
            fontSize: { type: "number", minimum: 8, maximum: 40 },
            fontFamily: { type: "string" },
            tabSize: { type: "number", minimum: 1, maximum: 8 },
            wordWrap: { type: "boolean" },
            wordWrapColumn: { type: "number" },
            rulers: { type: "string" },
            trimTrailingWhitespace: { type: "boolean" },
            insertFinalNewline: { type: "boolean" },
            renderWhitespace: { type: "boolean" },
            cursorStyle: { type: "string", enum: ["line", "block", "underline"] },
            minimap: { type: "boolean" },
            lineNumbers: { type: "boolean" },
            relativeLineNumbers: { type: "boolean" },
            stickyScroll: { type: "boolean" },
            stickyOutline: { type: "boolean" },
            inlayHints: { type: "boolean" },
            codeLens: { type: "boolean" },
            autoSaveMs: { type: "number" },
            terminalFontSize: { type: "number" },
          },
        },
        chromeAcrylic: { type: "boolean" },
        preferredEncoding: { type: "string" },
        desktopNotifications: { type: "boolean" },
        terminalTheme: { type: "string" },
        jsonSchemas: {
          type: "array",
          items: {
            type: "object",
            required: ["fileMatch", "uri"],
            properties: {
              fileMatch: { type: "array", items: { type: "string" } },
              uri: { type: "string" },
              schema: { type: "object" },
            },
          },
        },
      },
    },
  },
];

export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/\?/g, ".");
  return new RegExp(`${escaped}$`, "i");
}

export function matchesPattern(path: string, pattern: string): boolean {
  const norm = path.replace(/\\/g, "/");
  const regex = globToRegex(pattern.replace(/\\/g, "/"));
  return regex.test(norm);
}

export function findMatchingSchema(
  filePath: string,
  schemas: JsonSchemaAssociation[],
): JsonSchemaAssociation | null {
  for (const item of schemas) {
    if (item.fileMatch.some((pat) => matchesPattern(filePath, pat))) {
      return item;
    }
  }
  return null;
}

export function getEffectiveJsonSchemas(
  userSchemas: JsonSchemaAssociation[] = [],
): JsonSchemaAssociation[] {
  return [...BUILTIN_JSON_SCHEMAS, ...userSchemas];
}

export function configureJsonSchemas(
  monaco: Monaco,
  userSchemas: JsonSchemaAssociation[] = [],
): void {
  const allSchemas = getEffectiveJsonSchemas(userSchemas);
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    enableSchemaRequest: true,
    schemas: allSchemas.map((s) => ({
      uri: s.uri,
      fileMatch: s.fileMatch,
      schema: s.schema,
    })),
  });
}
