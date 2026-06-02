const fs = require('fs');
const path = require('path');

// Patch 1: guard against undefined generateBuildId function
// Root cause: Next.js 15 has an interop bug where ESM config modules lose their
// default export properties, so config.generateBuildId arrives as undefined.
const buildIdFile = path.join(__dirname, '../node_modules/next/dist/build/generate-build-id.js');
if (fs.existsSync(buildIdFile)) {
  const content = fs.readFileSync(buildIdFile, 'utf8');
  const patched = `if (typeof generate !== "function") generate = () => null;`;
  if (!content.includes(patched)) {
    const fixed = content.replace(
      'async function generateBuildId(generate, fallback) {',
      `async function generateBuildId(generate, fallback) {\n    ${patched}`
    );
    fs.writeFileSync(buildIdFile, fixed);
    console.log('✓ Patched next/dist/build/generate-build-id.js');
  }
}
