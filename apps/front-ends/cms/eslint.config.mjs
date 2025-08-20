import baseConfig from '../../../eslint.config.mjs';
import nextPlugin from '@next/eslint-plugin-next';

const config = [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // Next.js specific rules
      '@next/next/no-html-link-for-pages': 'warn',
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    ignores: ['.next/**/*', 'next-env.d.ts'],
  },
];

export default config;