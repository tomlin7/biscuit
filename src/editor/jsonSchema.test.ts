import { describe, expect, test } from "bun:test";
import {
  BUILTIN_JSON_SCHEMAS,
  configureJsonSchemas,
  findMatchingSchema,
  getEffectiveJsonSchemas,
  matchesPattern,
} from "./jsonSchema";

describe("JSON schema definitions and patterns", () => {
  test("includes built-in schemas for standard configuration files", () => {
    const uris = BUILTIN_JSON_SCHEMAS.map((s) => s.uri);
    expect(uris).toContain("vscode://schemas/package.json");
    expect(uris).toContain("vscode://schemas/tsconfig.json");
    expect(uris).toContain("https://schema.tauri.app/config/2");
    expect(uris).toContain("t3d://schemas/extension.json");
    expect(uris).toContain("t3d://schemas/settings.json");

    for (const item of BUILTIN_JSON_SCHEMAS) {
      expect(item.fileMatch.length).toBeGreaterThan(0);
      expect(item.schema).toBeDefined();
      expect((item.schema as any)?.type).toBe("object");
    }
  });

  test("validates package.json schema structure", () => {
    const pkgSchema = BUILTIN_JSON_SCHEMAS.find((s) => s.fileMatch.includes("*package.json"));
    expect(pkgSchema).toBeDefined();
    const schema = pkgSchema?.schema as any;
    expect(schema?.required).toContain("name");
    expect(schema?.properties?.dependencies).toBeDefined();
    expect(schema?.properties?.scripts).toBeDefined();
    expect(schema?.properties?.version).toBeDefined();
  });

  test("validates tsconfig.json schema structure", () => {
    const tsSchema = BUILTIN_JSON_SCHEMAS.find((s) => s.fileMatch.includes("*tsconfig.json"));
    expect(tsSchema).toBeDefined();
    const schema = tsSchema?.schema as any;
    expect(schema?.properties?.compilerOptions).toBeDefined();
    expect(schema?.properties?.include).toBeDefined();
    expect(schema?.properties?.exclude).toBeDefined();
  });

  test("matches file paths using glob patterns", () => {
    expect(matchesPattern("package.json", "*package.json")).toBe(true);
    expect(matchesPattern("package.json", "package.json")).toBe(true);
    expect(matchesPattern("E:/projects/app/package.json", "*package.json")).toBe(true);
    expect(matchesPattern("E:/projects/app/package.json", "package.json")).toBe(true);
    expect(matchesPattern("C:\\Users\\dev\\package.json", "*package.json")).toBe(true);
    expect(matchesPattern("tsconfig.json", "*tsconfig.json")).toBe(true);
    expect(matchesPattern("tsconfig.build.json", "*tsconfig.*.json")).toBe(true);
    expect(matchesPattern("tauri.conf.json", "*tauri.conf.json")).toBe(true);
    expect(matchesPattern("random.json", "*package.json")).toBe(false);
    expect(matchesPattern("not-package.json", "*package.json")).toBe(false);
    expect(matchesPattern("not-package.json", "package.json")).toBe(false);
    expect(matchesPattern("E:/app/not-package.json", "package.json")).toBe(false);
    expect(matchesPattern("fake-tsconfig.json", "*tsconfig.json")).toBe(false);
  });

  test("finds matching schema for a given file path", () => {
    const pkgMatch = findMatchingSchema("E:/biscuit/T3D/package.json", BUILTIN_JSON_SCHEMAS);
    expect(pkgMatch).not.toBeNull();
    expect(pkgMatch?.uri).toBe("vscode://schemas/package.json");

    const tsMatch = findMatchingSchema("src/tsconfig.app.json", BUILTIN_JSON_SCHEMAS);
    expect(tsMatch).not.toBeNull();
    expect(tsMatch?.uri).toBe("vscode://schemas/tsconfig.json");

    const unknownMatch = findMatchingSchema("data/report.json", BUILTIN_JSON_SCHEMAS);
    expect(unknownMatch).toBeNull();
  });

  test("merges user-configured schemas with built-in schemas", () => {
    const userSchemas = [
      {
        uri: "https://example.com/custom.schema.json",
        fileMatch: ["*custom.config.json"],
        schema: { type: "object", properties: { key: { type: "string" } } },
      },
    ];

    const merged = getEffectiveJsonSchemas(userSchemas);
    expect(merged.length).toBe(BUILTIN_JSON_SCHEMAS.length + 1);

    const customMatch = findMatchingSchema("custom.config.json", merged);
    expect(customMatch).not.toBeNull();
    expect(customMatch?.uri).toBe("https://example.com/custom.schema.json");
  });

  test("configures monaco json diagnostics options", () => {
    let capturedOptions: any = null;
    const mockMonaco: any = {
      languages: {
        json: {
          jsonDefaults: {
            setDiagnosticsOptions: (opts: any) => {
              capturedOptions = opts;
            },
          },
        },
      },
    };

    configureJsonSchemas(mockMonaco);
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions.validate).toBe(true);
    expect(capturedOptions.allowComments).toBe(true);
    expect(capturedOptions.enableSchemaRequest).toBe(true);
    expect(capturedOptions.schemas.length).toBe(BUILTIN_JSON_SCHEMAS.length);
  });
});
