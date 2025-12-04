import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChangelogEntry, FilterConfig } from './types';

const SHOPIFY_CHANGELOG_URL = 'https://shopify.dev/changelog';

export async function fetchShopifyChangelog(): Promise<ChangelogEntry[]> {
  try {
    const response = await axios.get(SHOPIFY_CHANGELOG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const entries: ChangelogEntry[] = [];

    // Shopify changelog structure - adjust selectors based on actual HTML structure
    $('article, .changelog-entry, [data-changelog-entry]').each((index, element) => {
      const $element = $(element);

      // Extract information - these selectors may need adjustment
      const title = $element.find('h2, h3, .title, [data-title]').first().text().trim();
      const date = $element.find('time, .date, [data-date]').first().attr('datetime') ||
                   $element.find('time, .date, [data-date]').first().text().trim();
      const category = $element.find('.category, [data-category]').first().text().trim() || 'General';
      const description = $element.find('p, .description, [data-description]').first().text().trim();

      // Generate URL - might be a direct link or need to be constructed
      let url = $element.find('a').first().attr('href') || '';
      if (url && !url.startsWith('http')) {
        url = `https://shopify.dev${url}`;
      } else if (!url) {
        url = SHOPIFY_CHANGELOG_URL;
      }

      // Create a unique ID based on title and date
      const id = Buffer.from(`${title}-${date}`).toString('base64').substring(0, 32);

      if (title && date) {
        entries.push({
          id,
          title,
          date,
          category,
          description,
          url
        });
      }
    });

    // If the above selectors don't work, try alternative approach
    if (entries.length === 0) {
      // Try to find changelog entries by common patterns
      $('h2, h3').each((index, element) => {
        const $element = $(element);
        const title = $element.text().trim();

        // Look for date nearby
        const $parent = $element.parent();
        const dateText = $parent.find('time').first().text().trim() ||
                         $parent.prevAll('time').first().text().trim() ||
                         $parent.nextAll('time').first().text().trim();

        // Get following paragraph as description
        const description = $element.next('p').text().trim();

        if (title && (dateText || description)) {
          const id = Buffer.from(`${title}-${dateText || index}`).toString('base64').substring(0, 32);
          entries.push({
            id,
            title,
            date: dateText || new Date().toISOString(),
            category: 'General',
            description,
            url: SHOPIFY_CHANGELOG_URL
          });
        }
      });
    }

    return entries;
  } catch (error) {
    console.error('Error fetching Shopify changelog:', error);
    throw error;
  }
}

export function applyFilters(entries: ChangelogEntry[], filters?: FilterConfig): ChangelogEntry[] {
  if (!filters) {
    return entries;
  }

  let filtered = entries;

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(entry =>
      filters.categories!.some(cat =>
        entry.category.toLowerCase().includes(cat.toLowerCase())
      )
    );
  }

  // Filter by keywords (include)
  if (filters.keywords && filters.keywords.length > 0) {
    filtered = filtered.filter(entry => {
      const searchText = `${entry.title} ${entry.description}`.toLowerCase();
      return filters.keywords!.some(keyword =>
        searchText.includes(keyword.toLowerCase())
      );
    });
  }

  // Filter by exclude keywords
  if (filters.excludeKeywords && filters.excludeKeywords.length > 0) {
    filtered = filtered.filter(entry => {
      const searchText = `${entry.title} ${entry.description}`.toLowerCase();
      return !filters.excludeKeywords!.some(keyword =>
        searchText.includes(keyword.toLowerCase())
      );
    });
  }

  return filtered;
}

export function markPriority(entry: ChangelogEntry, filters?: FilterConfig): { entry: ChangelogEntry; priority: 'high' | 'normal' } {
  if (!filters?.keywords || filters.keywords.length === 0) {
    return { entry, priority: 'normal' };
  }

  const searchText = `${entry.title} ${entry.description}`.toLowerCase();
  const criticalKeywords = ['breaking', 'deprecated', 'critical', 'security', 'urgent'];

  const hasCriticalKeyword = criticalKeywords.some(keyword =>
    searchText.includes(keyword.toLowerCase())
  );

  return {
    entry,
    priority: hasCriticalKeyword ? 'high' : 'normal'
  };
}

export async function getNewEntries(seenIds: string[], filters?: FilterConfig): Promise<ChangelogEntry[]> {
  const allEntries = await fetchShopifyChangelog();
  const unseenEntries = allEntries.filter(entry => !seenIds.includes(entry.id));
  return applyFilters(unseenEntries, filters);
}
