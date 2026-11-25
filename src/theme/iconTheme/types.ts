export type IconDefinition = {
  /** SVG inner markup or path data, or full <svg> tag. */
  svg?: string;
  /** Primary accent color for stroke or fill. */
  color?: string;
  /** Whether the SVG should be filled with the color (default: false, stroke). */
  fill?: boolean;
  /** Custom SVG viewBox (default: "0 0 24 24"). */
  viewBox?: string;
  /** Stroke width for stroke-based SVGs (default: 1.75). */
  strokeWidth?: number;
  /** Fallback badge text if badge style is used (e.g. "TS", "JS", "{}"). */
  badge?: string;
  /** Badge color tone class (e.g. "ts", "js", "rust", "md", "json"). */
  tone?: string;
};

export type IconThemeDefinition = {
  id: string;
  label: string;
  description?: string;
  isDark?: boolean;
  /** Default fallback icon for files without a specific mapping. */
  defaultFile?: IconDefinition | string;
  /** Default fallback icon for closed folders. */
  defaultFolder?: IconDefinition | string;
  /** Default fallback icon for open folders. */
  defaultFolderOpen?: IconDefinition | string;
  /** Map of lowercase file extensions (e.g. "ts", "tsx", "py", "rs") to icon definition or icon key. */
  fileExtensions?: Record<string, IconDefinition | string>;
  /** Map of lowercase file names (e.g. "package.json", "dockerfile", ".gitignore") to icon definition or icon key. */
  fileNames?: Record<string, IconDefinition | string>;
  /** Map of lowercase folder names (e.g. "src", "node_modules", "components") to icon definition or icon key. */
  folderNames?: Record<string, IconDefinition | string>;
  /** Map of lowercase open folder names to icon definition or icon key. */
  folderNamesOpen?: Record<string, IconDefinition | string>;
  /** Shared icon definitions dictionary referenced by key name. */
  icons?: Record<string, IconDefinition>;
};

export type ResolvedIcon = {
  svg?: string;
  color?: string;
  fill?: boolean;
  viewBox?: string;
  strokeWidth?: number;
  badge?: string;
  tone?: string;
  isNone?: boolean;
  isBadge?: boolean;
};
