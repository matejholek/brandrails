import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface AngularStyles {
  /** Global stylesheets from `architect.build.options.styles`, as absolute paths. */
  files: string[];
  /** `stylePreprocessorOptions.includePaths`, for resolving `@use` partials. */
  includePaths: string[];
  /** Stylesheets from packages, such as a prebuilt Angular Material theme. */
  packages: string[];
}

type StyleEntry = string | { input: string };

/** Reads the global stylesheets of every project in an Angular workspace (`angular.json`). */
export function readAngularJson(path: string): AngularStyles {
  const root = dirname(path);
  const workspace = JSON.parse(readFileSync(path, "utf8")) as {
    projects?: Record<string, { root?: string; architect?: Record<string, { options?: Record<string, unknown> }> }>;
  };
  const files = new Set<string>();
  const includePaths = new Set<string>();
  const packages = new Set<string>();
  for (const project of Object.values(workspace.projects ?? {})) {
    const options = project.architect?.build?.options ?? {};
    for (const entry of (options.styles as StyleEntry[] | undefined) ?? []) {
      const input = typeof entry === "string" ? entry : entry.input;
      if (!/\.(css|scss|sass)$/.test(input)) continue;
      if (/^(@|~|node_modules\/)/.test(input)) packages.add(input.replace(/^(~|node_modules\/)/, ""));
      else files.add(join(root, input));
    }
    const pre = options.stylePreprocessorOptions as { includePaths?: string[] } | undefined;
    for (const dir of pre?.includePaths ?? []) includePaths.add(join(root, dir));
  }
  return { files: [...files], includePaths: [...includePaths], packages: [...packages] };
}
