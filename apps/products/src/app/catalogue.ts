/**
 * The products team's catalogue.
 *
 * This is the remote's own domain data. The shell never imports it — it only ever
 * sees what `exposes` publishes, which is the whole point of the boundary. If the
 * products team adds a field here, the shell does not need to know, and does not
 * need to be redeployed.
 */
export interface Product {
  sku: string;
  name: string;
  blurb: string;
  /** In cents, because money is never a float. */
  price: number;
  was?: number;
  category: Category;
  /** 0–5, one decimal. */
  rating: number;
  reviews: number;
  stock: number;
  tags: string[];
}

export type Category = 'Runtime' | 'Contracts' | 'Observability' | 'Tooling';

export const CATEGORIES: Category[] = [
  'Runtime',
  'Contracts',
  'Observability',
  'Tooling',
];

export const PRODUCTS: Product[] = [
  {
    sku: 'AC-1',
    name: 'Shared Singleton Anvil, 50kg',
    blurb:
      'The classic. Declare it a singleton and one instance serves every remote; forget to, and a second one drops on your architecture from a height.',
    price: 12900,
    category: 'Contracts',
    rating: 4.6,
    reviews: 1284,
    stock: 41,
    tags: ['bestseller'],
  },
  {
    sku: 'AC-2',
    name: 'Remote Entry Rocket Skates',
    blurb:
      'Straps remoteEntry.mjs to your feet and fires it across the network at runtime. Landing where you expected is not guaranteed.',
    price: 24900,
    was: 29900,
    category: 'Runtime',
    rating: 4.2,
    reviews: 862,
    stock: 7,
    tags: ['sale', 'staff pick'],
  },
  {
    sku: 'AC-3',
    name: 'Peer-Dependency Magnet, Giant',
    blurb:
      'Attracts iron, steel, and every mismatched semver range still sitting in your shared scope.',
    price: 8900,
    category: 'Contracts',
    rating: 3.9,
    reviews: 431,
    stock: 0,
    tags: [],
  },
  {
    sku: 'AC-4',
    name: 'Version-Locked Portable Hole',
    blurb:
      'A hole exactly the shape of your requiredVersion. Anything else, however close, does not fit through.',
    price: 39900,
    category: 'Contracts',
    rating: 4.8,
    reviews: 2109,
    stock: 12,
    tags: ['bestseller', 'staff pick'],
  },
  {
    sku: 'AC-5',
    name: 'Dynamic-Import Unicycle, Jet-Propelled',
    blurb:
      'One wheel, one import(), and no meaningful fallback if the remote does not answer.',
    price: 54900,
    category: 'Runtime',
    rating: 3.6,
    reviews: 198,
    stock: 3,
    tags: ['new'],
  },
  {
    sku: 'AC-6',
    name: 'Manifest-Reading Binoculars, Telescopic',
    blurb:
      'See the horizon. See mf-manifest.json. See the outage coming, assuming you remembered to look.',
    price: 15900,
    was: 18900,
    category: 'Observability',
    rating: 4.4,
    reviews: 673,
    stock: 28,
    tags: ['sale'],
  },
  {
    sku: 'AC-7',
    name: 'Dehydrated Build-Artifact Boulders',
    blurb: 'Just add a module-federation.config.ts. Then step back rather briskly.',
    price: 4900,
    category: 'Tooling',
    rating: 4.1,
    reviews: 1512,
    stock: 156,
    tags: ['bestseller'],
  },
  {
    sku: 'AC-8',
    name: 'Instant Scaffold Girder Kit',
    blurb:
      'Nx generators, an exposes map, and one very optimistic remotes list.',
    price: 22900,
    category: 'Tooling',
    rating: 4.0,
    reviews: 289,
    stock: 19,
    tags: [],
  },
  {
    sku: 'AC-9',
    name: 'Container-Init Boots, Spring-Loaded',
    blurb:
      'Vertical travel with no upper limit — every bounce re-initialises a federation container from scratch.',
    price: 17900,
    category: 'Runtime',
    rating: 4.3,
    reviews: 540,
    stock: 22,
    tags: ['staff pick'],
  },
  {
    sku: 'AC-10',
    name: 'Share-Scope Periscope, Collapsible',
    blurb:
      "Look around the corner your bundler can't. Regret what the live share scope finds there.",
    price: 9900,
    category: 'Observability',
    rating: 3.8,
    reviews: 156,
    stock: 64,
    tags: ['new'],
  },
];

/** The one the shell embeds on its home page, once step 4 publishes it. */
export const FEATURED_SKU = 'AC-2';

export function featured(): Product {
  return PRODUCTS.find((p) => p.sku === FEATURED_SKU) ?? PRODUCTS[0];
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function stockLabel(stock: number): {
  text: string;
  tone: 'good' | 'warn' | 'bad';
} {
  if (stock === 0) return { text: 'Out of stock', tone: 'bad' };
  if (stock <= 10) return { text: `Only ${stock} left`, tone: 'warn' };
  return { text: 'In stock', tone: 'good' };
}
