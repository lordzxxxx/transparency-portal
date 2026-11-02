import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import portal from './portal.config';
import bukidnon from './portal.bukidnon.config';
import { DEFAULT_API, shortNameOf } from './src/config';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The portal's name and description in the HTML itself, for link previews and search engines. */
function portalHtml(api: string, selected: typeof portal): Plugin {
  const title = `${selected.name} · FY 2027 budget records`;
  const selection = selected.kind === 'deo' ? 'listed under its DPWH office' : 'selected by DPWH office or place-name search';
  const description = `FY 2027 project lines for ${shortNameOf(selected)}, ${selection}, with source-page links and enacted budget context from the BetterGov.ph Budget API.`;
  const url = selected.siteUrl
    ? `<link rel="canonical" href="${escape(selected.siteUrl)}" />\n    <meta property="og:url" content="${escape(selected.siteUrl)}" />`
    : '';
  return {
    name: 'portal-html',
    transformIndexHtml: (html) =>
      html
        .replaceAll('%PORTAL_TITLE%', escape(title))
        .replaceAll('%PORTAL_NAME%', escape(selected.name))
        .replaceAll('%PORTAL_DESCRIPTION%', escape(description))
        .replaceAll('%PORTAL_API%', escape(api))
        .replaceAll('%PORTAL_URL_META%', url),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (env.VITE_PORTAL_VARIANT && env.VITE_PORTAL_VARIANT !== 'bukidnon') throw new Error(`Unknown VITE_PORTAL_VARIANT: ${env.VITE_PORTAL_VARIANT}`);
  const selected = env.VITE_PORTAL_VARIANT === 'bukidnon' ? bukidnon : portal;
  const api = (env.VITE_API_BASE || selected.api || DEFAULT_API).replace(/\/+$/, '');
  return {
    plugins: [react(), portalHtml(api, selected)],
    server: {
      host: '0.0.0.0',
      // Reserved in ~/projects/ports.md (transparency-portal). strictPort so a
      // collision fails loudly instead of moving the URL.
      port: 5132,
      strictPort: true,
      allowedHosts: ['dev.neonplayground.com'],
    },
    preview: { host: '0.0.0.0', port: 5132, strictPort: true },
  };
});
