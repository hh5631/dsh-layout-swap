import { installReleaseCheck } from './release-check.mjs';

export function apply(ctx) {
  installReleaseCheck(ctx, new URL('../package.json', import.meta.url));
}
