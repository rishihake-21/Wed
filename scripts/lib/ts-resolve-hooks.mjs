// Module hooks that let Node load the app's own TypeScript the way Vite does: a relative import
// without an extension ("../core/layout") resolves to the .ts file next to it.
// Registered by register-ts.mjs; needs Node 22.6+ (type stripping) and no install.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HAS_EXTENSION = /\.[cm]?[jt]sx?$|\.json$/;

export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  if (relative && context.parentURL && !HAS_EXTENSION.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const url = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
    }
  }
  return nextResolve(specifier, context);
}
