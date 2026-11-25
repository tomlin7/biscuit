import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

type ExtensionManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  main?: string;
};

export type RegistryEntry = {
  id: string;
  name: string;
  version: string;
  description?: string;
  downloadUrl: string;
  sha256: string;
};

const ROOT = path.resolve(
  typeof import.meta.dirname === "string"
    ? path.join(import.meta.dirname, "..")
    : process.cwd(),
);
const EXTENSIONS_DIR = path.join(ROOT, "extensions");
const DIST_DIR = path.join(ROOT, "extensions-dist");

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function buildExtensions(): RegistryEntry[] {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    throw new Error(`Extensions directory not found at ${EXTENSIONS_DIR}`);
  }

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true });
  const registry: RegistryEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const extDir = path.join(EXTENSIONS_DIR, entry.name);
    const manifestPath = path.join(extDir, "extension.json");
    if (!fs.existsSync(manifestPath)) {
      console.warn(`Skipping ${entry.name}: missing extension.json`);
      continue;
    }

    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf-8"),
    ) as ExtensionManifest;
    if (!manifest.id || !manifest.name || !manifest.version) {
      console.warn(
        `Skipping ${entry.name}: invalid manifest (requires id, name, version)`,
      );
      continue;
    }

    const zipName = `${manifest.id}.zip`;
    const zipPath = path.join(DIST_DIR, zipName);

    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    execFileSync("tar", ["-a", "-c", "-f", zipPath, "-C", extDir, "."]);

    const hash = sha256File(zipPath);
    const downloadUrl = `https://raw.githubusercontent.com/Tomlin7/t3d/main/extensions-dist/${zipName}`;

    registry.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      downloadUrl,
      sha256: hash,
    });

    console.log(
      `Packaged ${manifest.id}@${manifest.version} -> ${zipName} (${hash.slice(0, 8)})`,
    );
  }

  registry.sort((a, b) => a.id.localeCompare(b.id));

  const indexPath = path.join(DIST_DIR, "index.json");
  fs.writeFileSync(
    indexPath,
    JSON.stringify(registry, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Wrote registry index with ${registry.length} extensions to ${indexPath}`,
  );
  return registry;
}

if (process.argv[1]?.includes("build-extensions")) {
  buildExtensions();
}
