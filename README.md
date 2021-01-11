# Eleventy Plugin - Tailwind

Install:

```
npm install @jamshop/eleventy-plugin-tailwind
```

## Usage

In you main config `.eleventy.js`: 
```js
const pluginTailwind = require("@jamshop/eleventy-plugin-tailwind");

module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(pluginTailwind, {
    entry: "src/tailwind.css",
    output: "_site/css/tailwind.css",
    inputDir: "site"
  });
  // and the rest of your config
};
```

This will compile `src/tailwind.css` to `_site/css/tailwind.css`.

In `src/tailwind.css` you can add Tailwind directives such as:

```css
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";
```

The `inputDir` option is required and should match your 11ty input directory. This is used to create a default Tailwind config that will correctly purge unused classnames from tailwindCSS. The default config can be extended by the inclusion of a `tailwind.config.js` file in the root directoy of your project or by passing a `tailwindConfig` option to the plugin. These option will be merged with the default configuration.