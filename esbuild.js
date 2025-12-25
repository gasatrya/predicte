const esbuild = require('esbuild')

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started')
    })
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`)
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        )
      })
      console.log('[watch] build finished')
    })
  },
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],

    // Bundling configuration
    bundle: true,
    format: 'cjs',
    platform: 'node',

    // Output configuration
    outfile: 'dist/extension.js',

    // Source map configuration: inline for dev, false for production
    sourcemap: production ? false : 'inline',
    sourcesContent: !production,

    // Optimization settings
    minify: production,
    treeShaking: true,
    keepNames: false,

    // Target configuration - ES2020 for Node.js compatibility
    target: 'node20',

    // External dependencies (VS Code API)
    external: ['vscode'],

    // Logging
    logLevel: production ? 'error' : 'silent',

    // Plugins
    plugins: [
      /* Add to the end of plugins array */
      esbuildProblemMatcherPlugin,
    ],

    // Additional options for better tree-shaking
    metafile: production, // Generate metafile for analysis in production builds

    // Define build constants
    define: production
      ? {
          'process.env.NODE_ENV': '"production"',
        }
      : {},
  })

  if (watch) {
    await ctx.watch()
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
