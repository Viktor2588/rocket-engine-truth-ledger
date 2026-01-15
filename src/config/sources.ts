/**
 * Source Configuration
 * Centralized registry of all data sources for the Truth Ledger
 *
 * Source Types:
 * - Static URLs: One-time or manual fetch pages
 * - RSS/Atom Feeds: Automated continuous ingestion
 * - APIs: Structured data endpoints
 */

import type { SourceType, DocType } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export type FeedType = 'rss' | 'atom' | 'json' | 'html' | 'api';

export interface SourceConfig {
  name: string;
  sourceType: SourceType;
  baseTrust: number;
  baseUrl: string;
  independenceCluster: string;
  description?: string;
  // Static URLs to fetch
  urls?: string[];
  // RSS/Atom feeds for continuous ingestion
  feeds?: Array<{
    url: string;
    type: FeedType;
    refreshIntervalMinutes: number;
    maxItems?: number;
  }>;
  // Default document type for this source
  defaultDocType: DocType;
  // Whether this source is active
  active: boolean;
  // Tags for categorization
  tags?: string[];
}

// ============================================================================
// SOURCE REGISTRY
// ============================================================================

export const SOURCE_REGISTRY: Record<string, SourceConfig> = {
  // ==========================================================================
  // GOVERNMENT AGENCIES (Highest Trust: 0.90-0.98)
  // ==========================================================================

  nasa: {
    name: 'NASA',
    sourceType: 'government_agency',
    baseTrust: 0.95,
    baseUrl: 'https://www.nasa.gov',
    independenceCluster: 'nasa',
    description: 'National Aeronautics and Space Administration',
    defaultDocType: 'technical_report',
    active: true,
    tags: ['official', 'us', 'agency'],
    urls: [
      'https://www.nasa.gov/humans-in-space/space-launch-system/',
      'https://www.nasa.gov/exploration-systems-development/',
      'https://www.nasa.gov/exploration-systems-development/rs-25-engines/',
      'https://www.nasa.gov/artemis/',
      'https://www.nasa.gov/sls-engines/',
    ],
    feeds: [
      {
        url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 50,
      },
      {
        url: 'https://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss',
        type: 'rss',
        refreshIntervalMinutes: 360,
        maxItems: 20,
      },
    ],
  },

  esa: {
    name: 'ESA',
    sourceType: 'government_agency',
    baseTrust: 0.95,
    baseUrl: 'https://www.esa.int',
    independenceCluster: 'esa',
    description: 'European Space Agency',
    defaultDocType: 'technical_report',
    active: true,
    tags: ['official', 'europe', 'agency'],
    urls: [
      'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Ariane_6',
      'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Vega-C',
      'https://www.esa.int/Enabling_Support/Space_Transportation',
    ],
    feeds: [
      {
        url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Transportation',
        type: 'rss',
        refreshIntervalMinutes: 120,
        maxItems: 30,
      },
    ],
  },

  faa: {
    name: 'FAA Commercial Space',
    sourceType: 'regulator',
    baseTrust: 0.95,
    baseUrl: 'https://www.faa.gov',
    independenceCluster: 'faa',
    description: 'Federal Aviation Administration - Office of Commercial Space Transportation',
    defaultDocType: 'regulation',
    active: true,
    tags: ['official', 'us', 'regulator', 'licensing'],
    urls: [
      'https://www.faa.gov/space/licenses',
      'https://www.faa.gov/space/additional_information/launches',
      'https://www.faa.gov/space/environmental',
    ],
  },

  jaxa: {
    name: 'JAXA',
    sourceType: 'government_agency',
    baseTrust: 0.92,
    baseUrl: 'https://www.jaxa.jp',
    independenceCluster: 'jaxa',
    description: 'Japan Aerospace Exploration Agency',
    defaultDocType: 'technical_report',
    active: true,
    tags: ['official', 'japan', 'agency'],
    urls: [
      'https://www.jaxa.jp/projects/rockets/h2a/index_j.html',
      'https://www.jaxa.jp/projects/rockets/h3/index_j.html',
      'https://www.jaxa.jp/projects/rockets/epsilon/index_j.html',
    ],
  },

  // ==========================================================================
  // MANUFACTURERS (High Trust: 0.80-0.90)
  // ==========================================================================

  spacex: {
    name: 'SpaceX Official',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.spacex.com',
    independenceCluster: 'spacex',
    description: 'Space Exploration Technologies Corp',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'commercial'],
    urls: [
      'https://www.spacex.com/vehicles/falcon-9/',
      'https://www.spacex.com/vehicles/falcon-heavy/',
      'https://www.spacex.com/vehicles/starship/',
      'https://www.spacex.com/vehicles/dragon/',
    ],
    feeds: [
      {
        url: 'https://www.spacex.com/api/v2/updates',
        type: 'api',
        refreshIntervalMinutes: 30,
        maxItems: 20,
      },
    ],
  },

  blueorigin: {
    name: 'Blue Origin Official',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.blueorigin.com',
    independenceCluster: 'blue_origin',
    description: 'Blue Origin LLC',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'commercial'],
    urls: [
      'https://www.blueorigin.com/new-glenn',
      'https://www.blueorigin.com/new-shepard',
      'https://www.blueorigin.com/engines',
      'https://www.blueorigin.com/news/',
    ],
  },

  rocketlab: {
    name: 'Rocket Lab Official',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.rocketlabusa.com',
    independenceCluster: 'rocket_lab',
    description: 'Rocket Lab USA Inc',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'nz', 'commercial'],
    urls: [
      'https://www.rocketlabusa.com/launch/electron/',
      'https://www.rocketlabusa.com/launch/neutron/',
      'https://www.rocketlabusa.com/space-systems/spacecraft/',
    ],
    feeds: [
      {
        url: 'https://www.rocketlabusa.com/updates/rss/',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 30,
      },
    ],
  },

  ula: {
    name: 'ULA Official',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.ulalaunch.com',
    independenceCluster: 'ula',
    description: 'United Launch Alliance',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'commercial'],
    urls: [
      'https://www.ulalaunch.com/rockets/vulcan-centaur',
      'https://www.ulalaunch.com/rockets/atlas-v',
      'https://www.ulalaunch.com/rockets/delta-iv-heavy',
    ],
  },

  aerojet: {
    name: 'Aerojet Rocketdyne',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.rocket.com',
    independenceCluster: 'aerojet',
    description: 'Aerojet Rocketdyne Holdings',
    defaultDocType: 'manufacturer_datasheet',
    active: true,
    tags: ['manufacturer', 'us', 'engines'],
    urls: [
      'https://www.rocket.com/space/liquid-engines',
      'https://www.rocket.com/space/liquid-engines/rs-25-engine',
      'https://www.rocket.com/space/liquid-engines/rl10-engine',
      'https://www.rocket.com/space/solid-rocket-motors',
    ],
  },

  arianespace: {
    name: 'Arianespace',
    sourceType: 'manufacturer',
    baseTrust: 0.88,
    baseUrl: 'https://www.arianespace.com',
    independenceCluster: 'arianespace',
    description: 'Arianespace SA',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'europe', 'commercial'],
    urls: [
      'https://www.arianespace.com/vehicle/ariane-6/',
      'https://www.arianespace.com/vehicle/vega-c/',
    ],
    feeds: [
      {
        url: 'https://www.arianespace.com/feed/',
        type: 'rss',
        refreshIntervalMinutes: 120,
        maxItems: 30,
      },
    ],
  },

  relativityspace: {
    name: 'Relativity Space',
    sourceType: 'manufacturer',
    baseTrust: 0.85,
    baseUrl: 'https://www.relativityspace.com',
    independenceCluster: 'relativity',
    description: 'Relativity Space Inc - 3D printed rockets',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'commercial', 'startup'],
    urls: [
      'https://www.relativityspace.com/terran-r',
    ],
  },

  firefly: {
    name: 'Firefly Aerospace',
    sourceType: 'manufacturer',
    baseTrust: 0.85,
    baseUrl: 'https://firefly.com',
    independenceCluster: 'firefly',
    description: 'Firefly Aerospace Inc',
    defaultDocType: 'company_news',
    active: true,
    tags: ['manufacturer', 'us', 'commercial', 'startup'],
    urls: [
      'https://firefly.com/launch-vehicles/',
      'https://firefly.com/spacecraft/',
    ],
  },

  // ==========================================================================
  // NEWS SOURCES (Medium-High Trust: 0.65-0.80)
  // ==========================================================================

  spacenews: {
    name: 'SpaceNews',
    sourceType: 'news',
    baseTrust: 0.80,
    baseUrl: 'https://spacenews.com',
    independenceCluster: 'spacenews',
    description: 'Premier space industry news source',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'industry', 'professional'],
    feeds: [
      {
        url: 'https://spacenews.com/feed/',
        type: 'rss',
        refreshIntervalMinutes: 30,
        maxItems: 50,
      },
      {
        url: 'https://spacenews.com/section/launch/feed/',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 30,
      },
    ],
  },

  nasaspaceflight: {
    name: 'NASASpaceFlight',
    sourceType: 'news',
    baseTrust: 0.78,
    baseUrl: 'https://www.nasaspaceflight.com',
    independenceCluster: 'nsf',
    description: 'L2 Community and comprehensive space news',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'community', 'detailed'],
    feeds: [
      {
        url: 'https://www.nasaspaceflight.com/feed/',
        type: 'rss',
        refreshIntervalMinutes: 30,
        maxItems: 50,
      },
    ],
  },

  spaceflightnow: {
    name: 'Spaceflight Now',
    sourceType: 'news',
    baseTrust: 0.78,
    baseUrl: 'https://spaceflightnow.com',
    independenceCluster: 'sfn',
    description: 'Spaceflight Now - Launch coverage and news',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'launches', 'coverage'],
    feeds: [
      {
        url: 'https://spaceflightnow.com/feed/',
        type: 'rss',
        refreshIntervalMinutes: 30,
        maxItems: 50,
      },
    ],
  },

  arstechnica_space: {
    name: 'Ars Technica Space',
    sourceType: 'news',
    baseTrust: 0.75,
    baseUrl: 'https://arstechnica.com',
    independenceCluster: 'arstechnica',
    description: 'Ars Technica Space & Science coverage by Eric Berger',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'tech', 'quality'],
    feeds: [
      {
        url: 'https://feeds.arstechnica.com/arstechnica/science',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 30,
      },
    ],
  },

  thespacereview: {
    name: 'The Space Review',
    sourceType: 'news',
    baseTrust: 0.75,
    baseUrl: 'https://www.thespacereview.com',
    independenceCluster: 'tsr',
    description: 'Essays and commentary on space exploration',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'analysis', 'essays'],
    urls: [
      'https://www.thespacereview.com/',
    ],
  },

  aviationweek: {
    name: 'Aviation Week Space',
    sourceType: 'news',
    baseTrust: 0.78,
    baseUrl: 'https://aviationweek.com',
    independenceCluster: 'avweek',
    description: 'Aviation Week & Space Technology',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'industry', 'professional'],
    feeds: [
      {
        url: 'https://aviationweek.com/rss/space',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 30,
      },
    ],
  },

  teslarati_space: {
    name: 'Teslarati Space',
    sourceType: 'news',
    baseTrust: 0.65,
    baseUrl: 'https://www.teslarati.com',
    independenceCluster: 'teslarati',
    description: 'SpaceX-focused news coverage',
    defaultDocType: 'news_article',
    active: true,
    tags: ['news', 'spacex', 'fan'],
    feeds: [
      {
        url: 'https://www.teslarati.com/category/spacex/feed/',
        type: 'rss',
        refreshIntervalMinutes: 30,
        maxItems: 40,
      },
    ],
  },

  // ==========================================================================
  // RESEARCH & ACADEMIC (High Trust: 0.75-0.90)
  // ==========================================================================

  ntrs: {
    name: 'NASA Technical Reports Server',
    sourceType: 'peer_reviewed',
    baseTrust: 0.90,
    baseUrl: 'https://ntrs.nasa.gov',
    independenceCluster: 'nasa',
    description: 'NASA Technical Reports Server - peer reviewed research',
    defaultDocType: 'peer_reviewed_paper',
    active: true,
    tags: ['research', 'technical', 'peer_reviewed'],
    urls: [
      'https://ntrs.nasa.gov/search?q=rocket%20engine&sortBy=dateCreated+desc',
    ],
  },

  aiaa: {
    name: 'AIAA Publications',
    sourceType: 'standards_body',
    baseTrust: 0.88,
    baseUrl: 'https://arc.aiaa.org',
    independenceCluster: 'aiaa',
    description: 'American Institute of Aeronautics and Astronautics',
    defaultDocType: 'peer_reviewed_paper',
    active: true,
    tags: ['research', 'standards', 'peer_reviewed'],
    urls: [
      'https://arc.aiaa.org/journal/jpp',
    ],
  },

  // ==========================================================================
  // REFERENCE & COMMUNITY (Medium Trust: 0.50-0.75)
  // ==========================================================================

  gunters_space: {
    name: "Gunter's Space Page",
    sourceType: 'research',
    baseTrust: 0.75,
    baseUrl: 'https://space.skyrocket.de',
    independenceCluster: 'independent',
    description: 'Comprehensive spaceflight encyclopedia by Gunter Krebs',
    defaultDocType: 'other',
    active: true,
    tags: ['reference', 'encyclopedia', 'comprehensive'],
    urls: [
      'https://space.skyrocket.de/directories/launcher.htm',
      'https://space.skyrocket.de/directories/engine.htm',
    ],
  },

  wikipedia_aerospace: {
    name: 'Wikipedia Aerospace',
    sourceType: 'wiki',
    baseTrust: 0.55,
    baseUrl: 'https://en.wikipedia.org',
    independenceCluster: 'wikipedia',
    description: 'Wikipedia spaceflight and aerospace articles',
    defaultDocType: 'wiki',
    active: true,
    tags: ['wiki', 'reference', 'community'],
    urls: [
      // Rocket engines
      'https://en.wikipedia.org/wiki/Raptor_(rocket_engine)',
      'https://en.wikipedia.org/wiki/Merlin_(rocket_engine)',
      'https://en.wikipedia.org/wiki/RS-25',
      'https://en.wikipedia.org/wiki/RL10',
      'https://en.wikipedia.org/wiki/BE-4',
      'https://en.wikipedia.org/wiki/F-1_(rocket_engine)',
      'https://en.wikipedia.org/wiki/RD-180',
      'https://en.wikipedia.org/wiki/RD-170',
      'https://en.wikipedia.org/wiki/NK-33',
      'https://en.wikipedia.org/wiki/Vulcain_(rocket_engine)',
      'https://en.wikipedia.org/wiki/Vinci_(rocket_engine)',
      'https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)',
      // Launch vehicles
      'https://en.wikipedia.org/wiki/Falcon_9',
      'https://en.wikipedia.org/wiki/Falcon_Heavy',
      'https://en.wikipedia.org/wiki/SpaceX_Starship',
      'https://en.wikipedia.org/wiki/New_Glenn',
      'https://en.wikipedia.org/wiki/Vulcan_Centaur',
      'https://en.wikipedia.org/wiki/Ariane_6',
      'https://en.wikipedia.org/wiki/Electron_(rocket)',
      'https://en.wikipedia.org/wiki/Space_Launch_System',
      'https://en.wikipedia.org/wiki/Long_March_5',
      // Comparison pages
      'https://en.wikipedia.org/wiki/Comparison_of_orbital_launch_systems',
      'https://en.wikipedia.org/wiki/Comparison_of_orbital_rocket_engines',
    ],
  },

  everyday_astronaut: {
    name: 'Everyday Astronaut',
    sourceType: 'blog',
    baseTrust: 0.60,
    baseUrl: 'https://everydayastronaut.com',
    independenceCluster: 'independent',
    description: 'Educational spaceflight content by Tim Dodd',
    defaultDocType: 'blog_post',
    active: true,
    tags: ['education', 'blog', 'video'],
    urls: [
      'https://everydayastronaut.com/raptor-engine/',
      'https://everydayastronaut.com/starship/',
    ],
  },

  // ==========================================================================
  // SOCIAL & COMMUNITY (Lower Trust: 0.30-0.50)
  // ==========================================================================

  reddit_spacex: {
    name: 'Reddit r/spacex',
    sourceType: 'forum',
    baseTrust: 0.35,
    baseUrl: 'https://www.reddit.com/r/spacex',
    independenceCluster: 'reddit',
    description: 'SpaceX community discussions and updates',
    defaultDocType: 'forum_post',
    active: true,
    tags: ['community', 'discussion', 'realtime'],
    feeds: [
      {
        url: 'https://www.reddit.com/r/spacex/.rss',
        type: 'rss',
        refreshIntervalMinutes: 15,
        maxItems: 50,
      },
    ],
  },

  reddit_rocketry: {
    name: 'Reddit r/rocketry',
    sourceType: 'forum',
    baseTrust: 0.30,
    baseUrl: 'https://www.reddit.com/r/rocketry',
    independenceCluster: 'reddit',
    description: 'Rocketry community discussions',
    defaultDocType: 'forum_post',
    active: true,
    tags: ['community', 'discussion', 'amateur'],
    feeds: [
      {
        url: 'https://www.reddit.com/r/rocketry/.rss',
        type: 'rss',
        refreshIntervalMinutes: 60,
        maxItems: 30,
      },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all active sources
 */
export function getActiveSources(): SourceConfig[] {
  return Object.values(SOURCE_REGISTRY).filter(s => s.active);
}

/**
 * Get sources by type
 */
export function getSourcesByType(type: SourceType): SourceConfig[] {
  return Object.values(SOURCE_REGISTRY).filter(s => s.active && s.sourceType === type);
}

/**
 * Get sources with RSS/Atom feeds
 */
export function getSourcesWithFeeds(): SourceConfig[] {
  return Object.values(SOURCE_REGISTRY).filter(s => s.active && s.feeds && s.feeds.length > 0);
}

/**
 * Get sources by tag
 */
export function getSourcesByTag(tag: string): SourceConfig[] {
  return Object.values(SOURCE_REGISTRY).filter(s => s.active && s.tags?.includes(tag));
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  Object.values(SOURCE_REGISTRY).forEach(s => {
    s.tags?.forEach(t => tags.add(t));
  });
  return Array.from(tags).sort();
}

/**
 * Get source config by key
 */
export function getSourceConfig(key: string): SourceConfig | undefined {
  return SOURCE_REGISTRY[key];
}

/**
 * Calculate total feed count
 */
export function getTotalFeedCount(): number {
  return Object.values(SOURCE_REGISTRY)
    .filter(s => s.active)
    .reduce((sum, s) => sum + (s.feeds?.length ?? 0), 0);
}

/**
 * Get feed refresh schedule
 */
export function getFeedRefreshSchedule(): Array<{
  sourceKey: string;
  sourceName: string;
  feedUrl: string;
  refreshIntervalMinutes: number;
}> {
  const schedule: Array<{
    sourceKey: string;
    sourceName: string;
    feedUrl: string;
    refreshIntervalMinutes: number;
  }> = [];

  Object.entries(SOURCE_REGISTRY).forEach(([key, config]) => {
    if (config.active && config.feeds) {
      config.feeds.forEach(feed => {
        schedule.push({
          sourceKey: key,
          sourceName: config.name,
          feedUrl: feed.url,
          refreshIntervalMinutes: feed.refreshIntervalMinutes,
        });
      });
    }
  });

  return schedule.sort((a, b) => a.refreshIntervalMinutes - b.refreshIntervalMinutes);
}
