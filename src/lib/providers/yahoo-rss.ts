import type { NewsItem } from '@/lib/types';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ',
};

function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#\d+|#x[0-9a-fA-F]+|\w+);/g, (match, code: string) => {
      if (code.startsWith('#x') || code.startsWith('#X')) {
        return String.fromCodePoint(parseInt(code.slice(2), 16));
      }
      if (code.startsWith('#')) return String.fromCodePoint(Number(code.slice(1)));
      return ENTITIES[code] ?? match;
    })
    .trim();
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

/** Yahoo puts the source in the article host, e.g. finance.yahoo.com -> Yahoo Finance. */
function publisherFrom(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return host === 'finance.yahoo.com' ? 'Yahoo Finance' : host;
  } catch {
    return '';
  }
}

/**
 * Per-ticker RSS feed.
 *
 * Preferred over the `/v1/finance/search` news array, which falls back to
 * generic market headlines when it has nothing for a symbol — that made the
 * "my portfolio" feed attribute unrelated stories to holdings.
 */
export async function getNews(symbol: string, count = 8): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let xml: string;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return items
    .map((raw) => {
      const link = tag(raw, 'link');
      const published = Date.parse(tag(raw, 'pubDate'));
      return {
        id: tag(raw, 'guid') || link,
        title: tag(raw, 'title'),
        publisher: publisherFrom(link),
        link,
        publishedAt: Number.isNaN(published) ? 0 : published,
        symbols: [symbol],
      };
    })
    .filter((n) => n.title && n.link)
    .slice(0, count);
}
