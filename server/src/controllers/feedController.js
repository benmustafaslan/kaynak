import dns from 'dns';
import { promisify } from 'util';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 10000 });
const dnsLookup = promisify(dns.lookup);

const ALLOWED_PROTOCOLS = ['https:', 'http:'];

/** Private/local IP ranges and hostnames that must not be fetched (SSRF mitigation). */
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // loopback
  /^10\./,                     // private
  /^172\.(1[6-9]|2\d|3[01])\./, // private
  /^192\.168\./,               // private
  /^169\.254\./,               // link-local
  /^0\./,                      // current network
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 private
  /^fd[0-9a-f]{2}:/i,          // IPv6 unique local
];

const BLOCKED_HOSTNAMES = ['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback'];

function isBlockedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const normalized = ip.toLowerCase().trim();
  return BLOCKED_IP_PATTERNS.some((re) => re.test(normalized));
}

function isBlockedHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') return true;
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.includes(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.localhost')) return true;
  return false;
}

function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(u.protocol)) return false;
    if (isBlockedHostname(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function resolveAndAssertNotPrivate(feedUrl) {
  const u = new URL(feedUrl);
  const hostname = u.hostname;
  try {
    const { address } = await dnsLookup(hostname, { family: 4 });
    if (isBlockedIp(address)) {
      throw new Error('Feed URL resolves to a disallowed address');
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') throw err;
    if (err.message && err.message.includes('disallowed')) throw err;
    try {
      const { address } = await dnsLookup(hostname, { family: 6 });
      if (isBlockedIp(address)) {
        throw new Error('Feed URL resolves to a disallowed address');
      }
    } catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') throw e;
      if (e.message && e.message.includes('disallowed')) throw e;
      throw err;
    }
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
    await resolveAndAssertNotPrivate(feedUrl);
    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || null,
      contentSnippet: item.contentSnippet || item.content ? String(item.content).replace(/<[^>]*>/g, '').slice(0, 500) : '',
    }));
    res.json({ title: feed.title || 'Feed', items });
  } catch (err) {
    if (err.message && err.message.includes('disallowed')) {
      return res.status(400).json({ error: 'Feed URL is not allowed' });
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return res.status(400).json({ error: 'Feed URL could not be resolved' });
    }
    next(err);
  }
};
