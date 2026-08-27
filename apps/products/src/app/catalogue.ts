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

export type Category = 'Propulsion' | 'Traps' | 'Optics' | 'Provisions';

export const CATEGORIES: Category[] = [
  'Propulsion',
  'Traps',
  'Optics',
  'Provisions',
];

export const PRODUCTS: Product[] = [
  {
    sku: 'AC-1',
    name: 'Anvil, 50kg',
    blurb: 'The classic. Gravity does the work; you supply the timing.',
    price: 12900,
    category: 'Traps',
    rating: 4.6,
    reviews: 1284,
    stock: 41,
    tags: ['bestseller'],
  },
  {
    sku: 'AC-2',
    name: 'Rocket Skates',
    blurb:
      'Strap in, point downhill, and reconsider your life choices at speed.',
    price: 24900,
    was: 29900,
    category: 'Propulsion',
    rating: 4.2,
    reviews: 862,
    stock: 7,
    tags: ['sale', 'staff pick'],
  },
  {
    sku: 'AC-3',
    name: 'Giant Magnet',
    blurb: 'Attracts iron, steel, and the occasional passing train.',
    price: 8900,
    category: 'Traps',
    rating: 3.9,
    reviews: 431,
    stock: 0,
    tags: [],
  },
  {
    sku: 'AC-4',
    name: 'Portable Hole',
    blurb:
      'A hole you can carry. Read the fine print about which side you are on.',
    price: 39900,
    category: 'Traps',
    rating: 4.8,
    reviews: 2109,
    stock: 12,
    tags: ['bestseller', 'staff pick'],
  },
  {
    sku: 'AC-5',
    name: 'Jet-Propelled Unicycle',
    blurb: 'One wheel, one engine, and no meaningful braking system.',
    price: 54900,
    category: 'Propulsion',
    rating: 3.6,
    reviews: 198,
    stock: 3,
    tags: ['new'],
  },
  {
    sku: 'AC-6',
    name: 'Telescopic Binoculars',
    blurb: 'See the horizon. See it get closer. See it too late.',
    price: 15900,
    was: 18900,
    category: 'Optics',
    rating: 4.4,
    reviews: 673,
    stock: 28,
    tags: ['sale'],
  },
  {
    sku: 'AC-7',
    name: 'Dehydrated Boulders',
    blurb: 'Just add water. Then step back rather briskly.',
    price: 4900,
    category: 'Provisions',
    rating: 4.1,
    reviews: 1512,
    stock: 156,
    tags: ['bestseller'],
  },
  {
    sku: 'AC-8',
    name: 'Instant Girder Kit',
    blurb: 'Bridges, scaffolds, and one very optimistic diving board.',
    price: 22900,
    category: 'Provisions',
    rating: 4.0,
    reviews: 289,
    stock: 19,
    tags: [],
  },
  {
    sku: 'AC-9',
    name: 'Spring-Loaded Boots',
    blurb: 'Vertical travel with no upper limit and no lower one either.',
    price: 17900,
    category: 'Propulsion',
    rating: 4.3,
    reviews: 540,
    stock: 22,
    tags: ['staff pick'],
  },
  {
    sku: 'AC-10',
    name: 'Periscope, Collapsible',
    blurb: 'Look around corners. Regret what you find there.',
    price: 9900,
    category: 'Optics',
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
