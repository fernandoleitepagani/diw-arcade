import type { Plugin } from 'vite';

/** Nomes dos woff2 críticos, já com hash do build. */
const CRITICAL_FONTS = [
  /^inter-latin-400-normal-.+\.woff2$/,
  /^press-start-2p-latin-400-normal-.+\.woff2$/,
] as const;

interface SocialMeta {
  attribute: 'property' | 'name';
  value: string;
}

const SOCIAL_META: readonly SocialMeta[] = [
  { attribute: 'property', value: 'og:image' },
  { attribute: 'property', value: 'og:url' },
  { attribute: 'name', value: 'twitter:image' },
];

function baseName(fileName: string): string {
  return fileName.slice(fileName.lastIndexOf('/') + 1);
}

function preloadTag(fileName: string): string {
  const path = fileName.replace(/^\/+/, '');
  return `<link rel="preload" as="font" type="font/woff2" crossorigin href="/${path}">`;
}

/** Gera um preload para cada fonte crítica presente no bundle, na ordem fixa. */
export function fontPreloadTags(fileNames: readonly string[]): string[] {
  return CRITICAL_FONTS.flatMap((pattern) => {
    const match = fileNames.find((fileName) => pattern.test(baseName(fileName)));
    return match ? [preloadTag(match)] : [];
  });
}

function hasMeta(tag: string, meta: SocialMeta): boolean {
  const pattern = new RegExp(
    `\\b${meta.attribute}\\s*=\\s*["']${meta.value}["']`,
    'i',
  );
  return pattern.test(tag);
}

function absolutizeContent(tag: string, siteUrl: string): string {
  return tag.replace(
    /(\bcontent\s*=\s*)(["'])(.*?)\2/i,
    (_match, prefix: string, quote: string, url: string) =>
      `${prefix}${quote}${new URL(url, siteUrl).href}${quote}`,
  );
}

/** Torna og:image, og:url e twitter:image absolutos em relação a `siteUrl`. */
export function absolutizeSocialUrls(
  html: string,
  siteUrl: string | undefined,
): string {
  if (!siteUrl) {
    return html;
  }

  return html.replace(/<meta\b[^>]*>/gi, (tag) =>
    SOCIAL_META.some((meta) => hasMeta(tag, meta))
      ? absolutizeContent(tag, siteUrl)
      : tag,
  );
}

function resolveSiteUrl(env: NodeJS.ProcessEnv): string | undefined {
  const configured = env.SITE_URL?.trim();
  if (configured) {
    return configured;
  }

  const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercelUrl ? `https://${vercelUrl}` : undefined;
}

/** Injeta preloads de fonte e URLs sociais absolutas no index.html do build. */
export function htmlHead(): Plugin {
  return {
    name: 'diw-html-head',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const withSocialUrls = absolutizeSocialUrls(
          html,
          resolveSiteUrl(process.env),
        );
        const tags = fontPreloadTags(Object.keys(ctx.bundle ?? {}));
        if (tags.length === 0) {
          return withSocialUrls;
        }

        return withSocialUrls.replace(
          '</head>',
          `    ${tags.join('\n    ')}\n  </head>`,
        );
      },
    },
  };
}
