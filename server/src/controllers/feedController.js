import Parser from 'rss-parser';

const parser = new Parser({ timeout: 10000 });

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    return ALLOWED_PROTOCOLS.includes(u.protocol);
  } catch {
    return false;
  }
}

export const getFeed = async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Feed URL is required' });
    }
    const feedUrl = url.trim();
    if (!isAllowedUrl(feedUrl)) {
      return res.status(400).json({ error: 'Invalid feed URL' });
    }
    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || null,
      contentSnippet: item.contentSnippet || item.content ? String(item.content).replace(/<[^>]*>/g, '').slice(0, 500) : '',
    }));
    res.json({ title: feed.title || 'Feed', items });
  } catch (err) {
    next(err);
  }
};
