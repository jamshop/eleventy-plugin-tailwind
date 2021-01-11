const tailwindcss = require("tailwindcss");
const Postcss = require("postcss");

const CleanCSS = require("clean-css");
require("css.escape");
const path = require("path");
const { readFileSync, outputFileSync, existsSync } = require("fs-extra");
const CSSErrorOverlay = require("./errorOverlay");

let tailwindConfigFile = {};
if (existsSync("./tailwind.config.js")) {
  tailwindConfigFile = require(path.join(
    process.cwd(),
    "./tailwind.config.js"
  ));
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

const compileTailwind = async ({
  entry,
  output,
  inputDir,
  tailwindConfig = {},
} = {}) => {
  if (!entry) {
    console.log(`No tailwind entry found.`);
    console.log(
      `Plugin expects options to include: { entry: "path/to/tailwind.css" }`
    );
    return;
  }

  if (!inputDir) {
    console.log(`No inputDir found.`);
    console.log(
      `Plugin expects inputDir to match your 11ty input directory. This is required to correctly purge CSS.`
    );
    return;
  }

  const mergedTailwindConfig = {
    purge: [
      `${inputDir}/**/*.html`,
      `${inputDir}/**/*.js`,
      `${inputDir}/**/*.vue`,
      `${inputDir}/**/*.md`,
      `${inputDir}/**/*.njk`,
      `${inputDir}/**/*.hbs`,
      `${inputDir}/**/*.liquid`,
      `${inputDir}/**/*.mdx`,
    ],
    future: {
      removeDeprecatedGapUtilities: true,
      purgeLayersByDefault: true,
    },
    ...tailwindConfigFile,
    ...tailwindConfig,
  };

  let result;
  try {
    const content = readFileSync(entry, "utf-8");
    result = await Postcss([tailwindcss(mergedTailwindConfig)]).process(
      content
    );

    result.warnings().forEach((message) => {
      console.log(message.toString());
    });
  } catch (error) {
    result = {
      error: error.message,
    };
  }

  if (!result || !result.css) {
    console.error("Error compiling stylesheet.");
    outputFileSync(
      output,
      CSSErrorOverlay(result.error || "Error compiling stylesheet.")
    );
  } else {
    outputFileSync(output, minifyCSS(result.css));
  }
};

const tailwindPlugin = (eleventyConfig, options) => {
  eleventyConfig.addWatchTarget(options.entry);

  compileTailwind(options);
  eleventyConfig.on("beforeWatch", (changedFiles) => {
    // Run me before --watch or --serve re-runs
    if (changedFiles.find((file) => pathRel(file) == pathRel(options.entry))) {
      compileTailwind(options);
    }
  });
};

module.exports = tailwindPlugin;
