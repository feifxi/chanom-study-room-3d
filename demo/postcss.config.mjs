// Tailwind CSS v4 through PostCSS, as the Next.js docs recommend. (The experimental
// @tailwindcss/turbopack loader missed edits to globals.css in dev and served stale styles.)
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
