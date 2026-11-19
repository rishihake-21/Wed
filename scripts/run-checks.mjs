// Runs every guard in one process. `npm run check` starts it with the flags the guards need
// (type stripping and the extensionless-import hook), so they can import the app's own pure
// TypeScript modules. Run a single guard the same way:
//   node --experimental-strip-types --no-warnings --import ./scripts/lib/register-ts.mjs scripts/check-quality.mjs
const CHECKS = ['check-layout', 'check-framing', 'check-quality', 'check-invocation'];

for (const name of CHECKS) {
  console.log(`\n── ${name}`);
  await import(`./${name}.mjs`);
}
console.log('\nall checks passed');
