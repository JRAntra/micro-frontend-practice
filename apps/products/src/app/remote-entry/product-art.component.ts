import { Component, computed, input } from '@angular/core';

/**
 * Generated product imagery.
 *
 * The catalogue needs pictures and this repo deliberately carries no binary
 * assets — nothing to keep in sync, nothing to license, nothing that bloats a
 * clone. So each product gets a deterministic little composition derived from its
 * SKU: two hues from a fixed palette, a silhouette picked by category, and a few
 * layered rounded shapes placed by a seeded pseudo-random sequence.
 *
 * Same SKU always draws the same picture, which matters more than it sounds — the
 * card is federated in step 4 and rendered by two different applications, and it
 * would be obvious if the shell's copy of a product looked different from the
 * remote's.
 */
type Category = 'Propulsion' | 'Traps' | 'Optics' | 'Provisions';

/** Hue pairs, warm to cool, all sitting comfortably beside the accent. */
const PALETTE: [number, number][] = [
  [18, 42],
  [352, 22],
  [200, 172],
  [265, 320],
  [40, 12],
  [160, 196],
];

/** A tiny deterministic PRNG so the same SKU always yields the same art. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

interface Blob {
  cx: number;
  cy: number;
  r: number;
  hue: number;
  alpha: number;
}

@Component({
  selector: 'app-product-art',
  template: `
    <div class="art" [attr.data-testid]="'product-art-' + sku()">
      <svg viewBox="0 0 320 240" role="img" [attr.aria-label]="label()">
        <defs>
          <linearGradient [attr.id]="gradId()" x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0"
              [attr.stop-color]="'hsl(' + hues()[0] + ' 62% 88%)'"
            />
            <stop
              offset="1"
              [attr.stop-color]="'hsl(' + hues()[1] + ' 52% 80%)'"
            />
          </linearGradient>
        </defs>

        <rect width="320" height="240" [attr.fill]="'url(#' + gradId() + ')'" />

        @for (b of blobs(); track $index) {
          <circle
            [attr.cx]="b.cx"
            [attr.cy]="b.cy"
            [attr.r]="b.r"
            [attr.fill]="'hsl(' + b.hue + ' 58% 62%)'"
            [attr.opacity]="b.alpha"
          />
        }

        <!-- A silhouette per category, so the four groups read differently at a glance. -->
        <g
          [attr.transform]="'translate(160 124) scale(1.9)'"
          fill="none"
          [attr.stroke]="'hsl(' + hues()[1] + ' 45% 26%)'"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.82"
        >
          @switch (category()) {
            @case ('Propulsion') {
              <path d="M-18 10 L0 -16 L18 10 Z" />
              <path d="M-8 10 L-8 18 M8 10 L8 18" />
              <circle cx="0" cy="-2" r="4" />
            }
            @case ('Traps') {
              <rect x="-18" y="-6" width="36" height="20" rx="4" />
              <path d="M-11 -6 L-11 -15 L11 -15 L11 -6" />
            }
            @case ('Optics') {
              <circle cx="-6" cy="0" r="10" />
              <circle cx="12" cy="4" r="6" />
              <path d="M2 -4 L7 -1" />
            }
            @default {
              <path d="M-16 -8 L16 -8 L12 16 L-12 16 Z" />
              <path d="M-9 -8 L-9 -16 L9 -16 L9 -8" />
            }
          }
        </g>
      </svg>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ProductArtComponent {
  readonly sku = input.required<string>();
  readonly category = input<Category>('Provisions');
  readonly name = input('');

  /** Unique per instance so two cards on one page do not share a gradient id. */
  readonly gradId = computed(
    () => `art-${this.sku().replace(/[^a-z0-9]/gi, '')}`
  );

  readonly hues = computed(() => {
    const rnd = seeded(this.sku());
    return PALETTE[Math.floor(rnd() * PALETTE.length)] ?? PALETTE[0];
  });

  readonly blobs = computed<Blob[]>(() => {
    const rnd = seeded(`${this.sku()}-blobs`);
    const [h1, h2] = this.hues();
    return Array.from({ length: 4 }, (_, i) => ({
      cx: 40 + rnd() * 240,
      cy: 30 + rnd() * 180,
      r: 34 + rnd() * 62,
      hue: i % 2 === 0 ? h1 : h2,
      alpha: 0.16 + rnd() * 0.2,
    }));
  });

  readonly label = computed(
    () => `Illustration of ${this.name() || this.sku()}`
  );
}
