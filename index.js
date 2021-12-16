const tailwindcss = require("tailwindcss");
const atImport = require("postcss-import");
const postcss = require("postcss");
const CleanCSS = require("clean-css");
const minimatch = require("minimatch")
require("css.escape");
const path = require("path");
const { readFileSync, outputFileSync, existsSync } = require("fs-extra");
const CSSErrorOverlay = require("./errorOverlay");

let CSSDeps = [];
let tailwindConfigFile = {};
const file = path.join(
  process.cwd(),
  "./tailwind.config.js"
);

if (existsSync(file)) {
  tailwindConfigFile = require(file);
}

const pathRel = (file) => path.relative(process.cwd(), file);

const minifyCSS = (css) => {
  const minified = new CleanCSS().minify(css);
  if (!minified.styles) {
    // At any point where we return CSS if it
    // errors we try to show an overlay.
    console.error("Error minifying stylesheet.");
    console.log(minified.errors);
    return CSSErrorOverlay(minified.errors[0]);
  }
  return minified.styles;
};

const getTailwindConfig = ({ inputDir, tailwindConfig = {} }) => ({
  mode: 'jit',
  // We're returning purge for now to support older versions.
  // ToDo: change to 'content' when we drop support for v2.
  purge: [
    `${inputDir}/**/*.html`,
    `${inputDir}/**/*.js`,
    `${inputDir}/**/*.ts`,
    `${inputDir}/**/*.vue`,
    `${inputDir}/**/*.jsx`,
    `${inputDir}/**/*.tsx`,
    `${inputDir}/**/*.mdx`,
    `${inputDir}/**/*.md`,
    `${inputDir}/**/*.njk`,
    `${inputDir}/**/*.hbs`,
    `${inputDir}/**/*.liquid`,
  ],
  ...tailwindConfigFile,
  ...tailwindConfig,
})


// Add a function to add new @imports found when compiling CSS
const trackCSSDeps = (newCSSDeps) => {
  newCSSDeps
    .filter(dep => !CSSDeps.includes(dep))
    .forEach(dep => {
      CSSDeps = [...CSSDeps, pathRel(dep)];
    })
}


const compileTailwind = async (options) => {

  const tailwindConfig = getTailwindConfig(options);
  let result;

  try {
    const content = readFileSync(options.entry, "utf-8");
    result = await postcss()
      .use(atImport())
      .use(tailwindcss(tailwindConfig))
      .process(content, { from: options.entry });

    result.warnings().forEach((message) => {
      console.log(message.toString());
    });

    const imports = result.messages
      .filter(message => (message.type === 'dependency' && message.plugin === 'postcss-import'))
      .map(imp => imp.file);

      trackCSSDeps(imports);

  } catch (error) {
    result = {
      error: error.message,
    };
  }

  if (!result || !result.css) {
    console.error("Error compiling stylesheet.");
    console.log(result.error);
    outputFileSync(
      options.output,
      CSSErrorOverlay(result.error || "Error compiling stylesheet.")
    );
  } else {
    outputFileSync(options.output, minifyCSS(result.css));
  }

};

const tailwindPlugin = async (eleventyConfig, options = {}) => {

  if (!options.entry) {
    console.log(`No tailwind entry found.`);
    console.log(
      `Plugin expects options to include: { entry: "path/to/tailwind.css" }`
    );
    return;
  }

  if (!options.inputDir) {
    console.log(`No inputDir found.`);
    console.log(
      `Plugin expects inputDir to match your 11ty input directory. This is required to correctly purge CSS.`
    );
    return;
  }

  getTailwindConfig(options);

  // Add the entry to the watch list
  eleventyConfig.addWatchTarget(options.entry);
  
  compileTailwind(options);

  eleventyConfig.on("beforeWatch", (changedFiles) => {

    // We're doing a lot of work here to make sure that we are not re-compiling CSS unless the changes files include:
    // CSS, CSS dependencies, or purge enteries from the tailwind config.
    // For future consideration: Tailwind v3+ with JIT is probably fast enough that there would be minimal cost to re-compiling everytime...?
    const isEntry = (file) => pathRel(file) == pathRel(options.entry)
    const isDep = (file) => CSSDeps.includes(pathRel(file))
    const isPurge = (file) => purgeOptions.some(glob => minimatch(pathRel(file), glob))

    // Recompile before --watch or --serve re-runs
    if (
      changedFiles.find((file) => isEntry(file) || isDep(file) || isPurge(file))
    ) {
     compileTailwind(options);
    }
  });
};

module.exports = tailwindPlugin;