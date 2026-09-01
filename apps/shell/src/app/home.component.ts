import { Component, OnInit, Type, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PRODUCTS_ORIGIN, remoteContainerLoaded } from '@mf-lab/lab-dashboard';

/**
 * The shell's own home page. Everything here is compiled into the shell —
 * except the featured card, which is fetched from the products remote at runtime
 * and rendered into a layout the shell controls.
 *
 * That difference is the whole subject of step 4, and this page is laid out to make
 * it visible. The slot has four states, and the section around it keeps working in
 * all of them:
 *
 *   loading     — the import has not settled yet
 *   federated   — the card is here AND remoteEntry.mjs was fetched. The real thing.
 *   bundled     — the card is here and nothing was fetched. Looks identical, is not
 *                 federation, and is the state a fresh clone starts in.
 *   unavailable — the remote published nothing, so there is no card at all.
 *
 * `bundled` is the one that earns its keep. Without it this page would happily
 * render a card and imply a federation that is not happening.
 */
@Component({
  selector: 'app-home',
  imports: [NgComponentOutlet, RouterLink],
  template: `
    <div class="page stack-lg">
      <!-- ------------------------------------------------------------- hero -->
      <section class="hero card">
        <div class="hero-copy">
          <span class="chip chip-accent"
            >Est. 1949 · Ships across the share scope</span
          >
          <h1 data-testid="home-heading">
            Everything you need,<br />
            slightly faster than advisable.
          </h1>
          <p class="lede">
            Remote entries, shared singletons, version contracts. Boundary
            &amp; Co. has been federating ambitious architectures for three
            quarters of a century, and no shared dependency has ever once
            resolved cleanly on the first try.
          </p>
          <div class="row row-wrap">
            <a routerLink="/start" class="btn btn-primary"
              >Start here →</a
            >
            <a routerLink="/products" class="btn">Browse the catalogue</a>
            <a routerLink="/lab" class="btn btn-quiet"
              >See how this page is built</a
            >
          </div>
        </div>

        <div class="hero-art" aria-hidden="true">
          <svg viewBox="0 0 400 320">
            <defs>
              <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="hsl(18 70% 88%)" />
                <stop offset="1" stop-color="hsl(200 55% 84%)" />
              </linearGradient>
            </defs>
            <rect width="400" height="320" rx="20" fill="url(#hero-g)" />
            <circle
              cx="120"
              cy="90"
              r="70"
              fill="hsl(18 62% 66%)"
              opacity="0.3"
            />
            <circle
              cx="290"
              cy="210"
              r="95"
              fill="hsl(200 50% 60%)"
              opacity="0.25"
            />
            <g
              transform="translate(200 160) scale(3.4)"
              fill="none"
              stroke="hsl(20 45% 28%)"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.8"
            >
              <rect x="-18" y="-6" width="36" height="20" rx="4" />
              <path d="M-11 -6 L-11 -15 L11 -15 L11 -6" />
            </g>
          </svg>
        </div>
      </section>

      <!-- ------------------------------------------------- trust / stats bar -->
      <section class="stats">
        @for (s of stats; track s.label) {
        <div class="stat">
          <strong>{{ s.value }}</strong>
          <span class="tiny muted">{{ s.label }}</span>
        </div>
        }
      </section>

      <!-- ----------------------------------------------------- featured slot -->
      <section>
        <div class="section-head">
          <h2>This week's pick</h2>
          <span
            class="chip"
            [class.chip-good]="state() === 'federated'"
            [class.chip-warn]="state() === 'bundled'"
          >
            @switch (state()) {
              @case ('federated') {
                fetched from the remote at runtime
              }
              @case ('bundled') {
                compiled into the shell — not federated
              }
              @case ('loading') {
                loading…
              }
              @default {
                remote publishes nothing
              }
            }
          </span>
          <a routerLink="/products" class="btn btn-quiet btn-sm push">All products →</a>
        </div>

        <div class="featured">
          <!--
            STEP s4: the shell asks the products remote for a single COMPONENT here.
            If the remote does not publish it, this block renders the placeholder
            beside it and the rest of the page is unaffected — which is the
            behaviour you want from an optional embed, and also why a missing expose
            is easy to miss.
          -->
          @if (featured()) {
          <ng-container *ngComponentOutlet="featured()!"></ng-container>
          } @else if (state() === 'loading') {
          <div class="ph card">
            <div class="skeleton art"></div>
            <div class="skeleton line w70"></div>
            <div class="skeleton line w40"></div>
          </div>
          } @else {
          <div
            class="ph card card-pad unavailable"
            data-testid="featured-unavailable"
          >
            <span class="chip chip-warn">Nothing published</span>
            <p>
              The products remote publishes no <code>./ProductCard</code>, so
              the shell has nothing to put in this slot.
            </p>
            <p class="tiny muted">
              Notice what did <em>not</em> happen: the page still rendered, the
              header still works, and no error reached the console. An optional
              embed should fail exactly this quietly — which is also why you can
              ship a broken one without noticing.
            </p>
            <p class="tiny muted">
              That is step 4. See
              <code>guide/04-federate-one-component.md</code>.
            </p>
          </div>
          }

          <div class="explain card card-pad">
            <span class="eyebrow">How this section works</span>
            <p class="tiny">
              The heading, the layout and this box are
              <strong>shell</strong> code. The card beside it is authored by the
              products team.
            </p>

            @if (state() === 'bundled') {
            <p class="tiny warnline">
              Right now it is <strong>not</strong> arriving over the network. No
              <code>remoteEntry.mjs</code> has been fetched from
              <code>{{ productsOrigin }}</code
              >, which means webpack satisfied
              <code>import('products/ProductCard')</code> from the tsconfig path
              mapping and compiled the remote's component straight into this
              bundle.
            </p>
            <p class="tiny muted">
              It looks completely correct and it is not federation. One build,
              one deploy, and none of the independence that was the point — and
              nothing on screen would have told you if this box were not here.
              That is what steps 2 and 4 are really about.
            </p>
            } @else if (state() === 'federated') {
            <p class="tiny goodline">
              This card genuinely arrived over the network: the browser fetched
              <code>remoteEntry.mjs</code> from
              <code>{{ productsOrigin }}</code> while you were looking at the
              page. Check the Network tab if you want to see it.
            </p>
            }

            <p class="tiny muted">
              A federated <em>route</em> hands over a whole page. A federated
              <em>component</em>
              like this one drops into a page the shell still owns and lays out,
              so the two teams now have to agree about far more: spacing,
              theming, and what appears when it is missing.
            </p>
          </div>
        </div>
      </section>

      <!-- --------------------------------------------------------- categories -->
      <section>
        <div class="section-head">
          <h2>Departments</h2>
          <span class="chip">shell-rendered</span>
        </div>
        <div class="cats">
          @for (c of categories; track c.name) {
          <a routerLink="/products" class="cat card">
            <span
              class="cat-art"
              [style.background]="c.tint"
              aria-hidden="true"
            ></span>
            <span class="cat-body">
              <strong>{{ c.name }}</strong>
              <span class="tiny muted">{{ c.note }}</span>
            </span>
            <span class="cat-go" aria-hidden="true">→</span>
          </a>
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      /* hero */
      .hero {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: var(--gap-6);
        align-items: center;
        padding: var(--gap-7);
        border-radius: var(--r-xl);
        overflow: hidden;
      }
      .hero-copy {
        display: grid;
        gap: var(--gap-4);
        justify-items: start;
      }
      .hero h1 {
        font-size: var(--text-3xl);
      }
      .lede {
        font-size: var(--text-lg);
        color: var(--ink-2);
        max-width: 46ch;
      }
      .hero-art svg {
        width: 100%;
        height: auto;
        display: block;
        border-radius: var(--r-lg);
      }

      /* stats */
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--gap-3);
      }
      .stat {
        display: grid;
        gap: 2px;
        padding: var(--gap-4);
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--r);
      }
      .stat strong {
        font-size: var(--text-xl);
        letter-spacing: -0.02em;
      }

      /* featured */
      .featured {
        display: grid;
        grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
        gap: var(--gap-5);
        align-items: start;
      }
      .ph {
        display: grid;
        gap: var(--gap-3);
      }
      .ph .art {
        aspect-ratio: 4 / 3;
      }
      .ph .line {
        height: 13px;
      }
      .w70 {
        width: 70%;
      }
      .w40 {
        width: 40%;
      }
      .unavailable {
        justify-items: start;
      }
      .explain {
        display: grid;
        gap: var(--gap-2);
        background: var(--paper-2);
      }
      .warnline {
        color: var(--warn);
        line-height: 1.55;
      }
      .goodline {
        color: var(--good);
        line-height: 1.55;
      }

      /* categories */
      .cats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--gap-3);
      }
      .cat {
        display: grid;
        grid-template-columns: 44px 1fr auto;
        align-items: center;
        gap: var(--gap-3);
        padding: var(--gap-3) var(--gap-4);
        transition: transform 0.16s var(--ease), box-shadow 0.16s var(--ease);
      }
      .cat:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
      }
      .cat-art {
        width: 44px;
        height: 44px;
        border-radius: var(--r-sm);
      }
      .cat-body {
        display: grid;
        line-height: 1.35;
      }
      .cat-go {
        color: var(--ink-4);
      }
      .cat:hover .cat-go {
        color: var(--accent);
      }

      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
          padding: var(--gap-5);
        }
        .hero-art {
          order: -1;
        }
        .featured {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  readonly featured = signal<Type<unknown> | null>(null);
  readonly productsOrigin = PRODUCTS_ORIGIN;

  /**
   * `loaded` is deliberately not one of these.
   *
   * "The component rendered" and "the component came from the remote" are different
   * facts, and conflating them is the single easiest way to believe you have
   * finished this lab when you have not. `bundled` is the state where the card is on
   * screen and no federation happened — see remoteContainerLoaded() for why the
   * distinction has to be drawn from a network observation rather than from whether
   * the import resolved.
   */
  readonly state = signal<'loading' | 'federated' | 'bundled' | 'unavailable'>(
    'loading'
  );

  readonly stats = [
    { value: '10', label: 'concepts in catalogue' },
    { value: '2', label: 'independently deployed apps' },
    { value: '1', label: 'shared share scope' },
    { value: '0', label: 'binary assets shipped' },
  ];

  readonly categories = [
    {
      name: 'Runtime',
      note: 'Remote entries, dynamic imports',
      tint: 'hsl(18 62% 82%)',
    },
    {
      name: 'Contracts',
      note: 'Shared singletons, semver locks',
      tint: 'hsl(352 48% 84%)',
    },
    {
      name: 'Observability',
      note: 'Manifests, live share scope',
      tint: 'hsl(200 52% 82%)',
    },
    {
      name: 'Tooling',
      note: 'Config, generators, scaffolds',
      tint: 'hsl(160 40% 82%)',
    },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const mod = await import('products/ProductCard');
      this.featured.set(mod.ProductCardComponent);
      // Resolving the import is not evidence of federation. Ask the network.
      this.state.set(
        remoteContainerLoaded('products', PRODUCTS_ORIGIN)
          ? 'federated'
          : 'bundled'
      );
    } catch {
      // The remote didn't publish it (or is unreachable). An optional embed must
      // never take the host's page down with it.
      this.featured.set(null);
      this.state.set('unavailable');
    }
  }
}
