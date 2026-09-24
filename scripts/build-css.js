const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const forms = require('@tailwindcss/forms');
const containerQueries = require('@tailwindcss/container-queries');

const root = path.resolve(__dirname, '..');

function getFilesRecursively(dir, extensions) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'archive') {
        files = files.concat(getFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function build() {
  const content = [];
  const scannedFiles = [
    ...getFilesRecursively(path.join(root, 'frontend'), ['.html', '.js']),
    ...getFilesRecursively(path.join(root, 'components'), ['.tsx', '.jsx', '.js'])
  ];

  const uniqueFiles = [...new Set(scannedFiles)];
  for (const file of uniqueFiles) {
    const ext = path.extname(file).replace('.', '');
    content.push({ raw: fs.readFileSync(file, 'utf8'), extension: ext });
  }

  const config = {
    content,
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          'primary-container': '#f5d77f',
          'on-tertiary-fixed': '#241a00',
          secondary: '#c0c6da',
          'on-tertiary': '#3c2f00',
          'primary-fixed-dim': '#e1c46e',
          background: '#10141a',
          'outline-variant': '#4c4638',
          'surface-bright': '#353940',
          'surface-container-high': '#262a31',
          'on-primary-container': '#725c0f',
          'on-surface-variant': '#cfc6b3',
          primary: '#fff5e1',
          'surface-container': '#1c2026',
          'surface-container-low': '#181c22',
          outline: '#98907f',
          'surface-variant': '#31353c',
          'tertiary-fixed': '#ffe088',
          tertiary: '#fff5e1',
          'on-primary-fixed-variant': '#574500',
          'secondary-fixed-dim': '#c0c6da',
          'surface-container-highest': '#31353c',
          'on-primary-fixed': '#231b00',
          'on-secondary': '#2a3040',
          'tertiary-fixed-dim': '#e9c349',
          surface: '#10141a',
          'primary-fixed': '#ffe087',
          'on-tertiary-fixed-variant': '#574500',
          'secondary-fixed': '#dde2f7',
          'tertiary-container': '#fdd55a',
          'on-surface': '#dfe2eb',
          'on-secondary-container': '#afb5c8',
          'inverse-surface': '#dfe2eb',
          'surface-container-lowest': '#0a0e14',
          'on-background': '#dfe2eb',
          'on-primary': '#3c2f00',
          'secondary-container': '#414657',
          'surface-tint': '#e1c46e',
          appDark: '#0D1117',
          appCard: '#151921',
          appCardBorder: 'rgba(217, 180, 126, 0.22)',
          goldAccent: '#F3D182',
          goldMuted: '#BBA06B',
          textGray: '#8E96A4',
          lightMuted: '#ADB5BD',
        },
        borderRadius: { DEFAULT: '1rem', lg: '2rem', xl: '3rem', full: '9999px' },
        spacing: {
          'space-3xl': '4rem',
          'space-sm': '0.75rem',
          'header-height': '4.5rem',
          'space-xl': '2rem',
          'space-2xl': '3rem',
          'space-2xs': '0.25rem',
          'sidebar-width': '5rem',
          'space-lg': '1.5rem',
          'space-xs': '0.5rem',
          'space-md': '1rem',
        },
        fontFamily: {
          'body-sm': ['"Plus Jakarta Sans"'],
          'label-badge': ['"Plus Jakarta Sans"'],
          'label-numeric': ['"Space Grotesk"'],
          'headline-sm': ['"Plus Jakarta Sans"'],
          'display-lg': ['"Plus Jakarta Sans"'],
          'label-caps': ['"Space Grotesk"'],
          'body-lg': ['"Plus Jakarta Sans"'],
          'headline-lg': ['"Plus Jakarta Sans"'],
          'headline-md': ['"Plus Jakarta Sans"'],
          'headline-xl': ['"Plus Jakarta Sans"'],
          'body-md': ['"Plus Jakarta Sans"'],
          sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          serifTitle: ['"Cinzel"', 'serif'],
          serif: ['"Playfair Display"', '"Bodoni Moda"', 'Didot', 'serif'],
          cinzel: ['"Cinzel"', 'serif'],
        },
        fontSize: {
          'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
          'label-badge': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '700' }],
          'label-numeric': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
          'headline-sm': ['15px', { lineHeight: '22px', letterSpacing: '0.01em', fontWeight: '600' }],
          'display-lg': ['36px', { lineHeight: '44px', letterSpacing: '0.02em', fontWeight: '800' }],
          'label-caps': ['11px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600' }],
          'body-lg': ['15px', { lineHeight: '24px', fontWeight: '400' }],
          'headline-lg': ['22px', { lineHeight: '30px', letterSpacing: '0.02em', fontWeight: '700' }],
          'headline-md': ['18px', { lineHeight: '26px', letterSpacing: '0.01em', fontWeight: '600' }],
          'headline-xl': ['28px', { lineHeight: '36px', letterSpacing: '0.03em', fontWeight: '700' }],
          'body-md': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        },
      },
    },
    plugins: [forms, containerQueries],
    corePlugins: { preflight: true },
  };

  const inputCss = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* Base Reset Overrides */
    a, a:visited, a:hover, a:active {
      text-decoration: none !important;
      color: inherit;
    }
  `;

  return postcss([tailwind(config), autoprefixer()])
    .process(inputCss, { from: undefined })
    .then((result) => {
      const outputBanner = '/* Compiled from Tailwind CSS for NovelCast; preflight + components + utilities */\n';
      const finalCss = outputBanner + result.css;
      
      const targets = [
        path.join(root, 'frontend/css/site.css')
      ];

      for (const target of targets) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, finalCss);
        console.log('Wrote', target, finalCss.length, 'bytes');
      }
    });
}

(async () => {
  await build();
})();
