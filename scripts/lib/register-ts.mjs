// Preload for the check scripts: `node --experimental-strip-types --import ./scripts/lib/register-ts.mjs <script>`.
import { register } from 'node:module';

register('./ts-resolve-hooks.mjs', import.meta.url);
