import { Component, computed, input } from '@angular/core';
import { LabSnapshot } from './lab-probe.service';

/**
 * The host/remote picture, drawn from what is actually happening.
 *
 * The README has this same diagram in ASCII. The difference here is that it is
 * wired to the probes: the remote box is grey until it publishes something, and
 * the runtime-fetch arrow stays dashed until the shell has genuinely declared the
 * remote. Watching the arrow go solid is the moment step 2 lands.
 */
@Component({
  selector: 'lab-federation-diagram',
  template: `
    <svg viewBox="0 0 640 300" role="img" [attr.aria-label]="summary()">
      <!-- one browser tab -->
      <rect x="8" y="8" width="624" height="150" rx="10" class="tab" />
      <text x="24" y="30" class="caption">one browser tab</text>

      <!-- shell (host) -->
      <rect x="28" y="44" width="340" height="100" rx="8" class="box host" />
      <text x="44" y="68" class="title">apps/shell</text>
      <text x="44" y="86" class="sub">host — owns the page chrome</text>
      <line x1="44" y1="98" x2="352" y2="98" class="rule" />
      <text x="44" y="118" class="mono">/ → Home</text>
      <text x="44" y="136" class="mono">
        /products →
        <tspan [class]="routeClass()">{{ routeLabel() }}</tspan>
      </text>

      <!-- share scope -->
      <rect x="384" y="44" width="240" height="100" rx="8" class="box scope" />
      <text x="400" y="68" class="title">share scope</text>
      <text x="400" y="86" class="sub">{{ scopeCount() }}</text>
      <!-- &#64; rather than a literal @: Angular's template parser reads a bare @ as a
           control-flow block and refuses to compile. -->
      <text x="400" y="112" class="mono small">
        &#64;angular/core
        <tspan [class]="coreClass()">{{ coreLabel() }}</tspan>
      </text>
      <text x="400" y="130" class="mono small">
        shared-auth
        <tspan [class]="authClass()">{{ authLabel() }}</tspan>
      </text>

      <!-- the runtime fetch -->
      <path
        [attr.d]="'M 200 144 L 200 200'"
        [class]="'arrow ' + arrowState()"
        marker-end="url(#head)"
      />
      <text x="212" y="178" [class]="'edge ' + arrowState()">
        {{ arrowLabel() }}
      </text>

      <!-- products (remote) -->
      <rect
        x="28"
        y="204"
        width="340"
        height="80"
        rx="8"
        [class]="'box ' + remoteState()"
      />
      <text x="44" y="228" class="title">apps/products</text>
      <text x="44" y="246" class="sub">
        remote — built and deployed on its own
      </text>
      <text x="44" y="270" class="mono">
        remoteEntry.mjs
        <tspan [class]="exposesClass()">{{ exposesLabel() }}</tspan>
      </text>

      <defs>
        <marker
          id="head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" class="head" />
        </marker>
      </defs>
    </svg>
  `,
  styles: [
    `
      svg {
        display: block;
        width: 100%;
        height: auto;
        max-width: 660px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .tab {
        fill: none;
        stroke: var(--lab-line);
        stroke-dasharray: 3 4;
      }
      .box {
        stroke-width: 1.5;
      }
      .host {
        fill: var(--lab-surface);
        stroke: var(--lab-line-strong);
      }
      .scope {
        fill: var(--lab-surface);
        stroke: var(--lab-line);
      }
      .box.live {
        fill: var(--lab-ok-bg);
        stroke: var(--lab-ok);
      }
      .box.idle {
        fill: var(--lab-surface-dim);
        stroke: var(--lab-line);
      }
      .box.down {
        fill: var(--lab-bad-bg);
        stroke: var(--lab-bad);
        stroke-dasharray: 4 3;
      }
      .rule {
        stroke: var(--lab-line);
      }
      .caption {
        font-size: 11px;
        fill: var(--lab-text-dim);
      }
      .title {
        font-size: 14px;
        font-weight: 600;
        fill: var(--lab-text);
      }
      .sub {
        font-size: 11px;
        fill: var(--lab-text-dim);
      }
      .mono {
        font-size: 12px;
        fill: var(--lab-text);
      }
      .mono.small {
        font-size: 11px;
      }
      .arrow {
        fill: none;
        stroke-width: 2;
      }
      .arrow.wired {
        stroke: var(--lab-ok);
      }
      .arrow.unwired {
        stroke: var(--lab-bad);
        stroke-dasharray: 5 4;
      }
      .arrow.down {
        stroke: var(--lab-line);
        stroke-dasharray: 2 5;
      }
      .head {
        fill: var(--lab-text-dim);
      }
      .edge {
        font-size: 11px;
      }
      .edge.wired {
        fill: var(--lab-ok);
      }
      .edge.unwired {
        fill: var(--lab-bad);
      }
      .edge.down {
        fill: var(--lab-text-dim);
      }
      .ok {
        fill: var(--lab-ok);
        font-weight: 600;
      }
      .bad {
        fill: var(--lab-bad);
      }
      .dim {
        fill: var(--lab-text-dim);
      }
    `,
  ],
})
export class FederationDiagramComponent {
  readonly snapshot = input.required<LabSnapshot>();

  private readonly s1 = computed(() =>
    this.snapshot().steps.find((s) => s.step.id === 's1')
  );
  private readonly s2 = computed(() =>
    this.snapshot().steps.find((s) => s.step.id === 's2')
  );

  readonly remoteState = computed(() => {
    const snap = this.snapshot();
    if (!snap.remote.reachable) return 'down';
    return snap.remote.exposes.length > 0 ? 'live' : 'idle';
  });

  readonly arrowState = computed(() => {
    if (!this.snapshot().remote.reachable) return 'down';
    return this.s2()?.verdict === 'done' ? 'wired' : 'unwired';
  });

  readonly arrowLabel = computed(() => {
    switch (this.arrowState()) {
      case 'wired':
        return 'fetched at runtime';
      case 'down':
        return 'remote not running';
      default:
        return 'not federated yet';
    }
  });

  readonly routeLabel = computed(() =>
    this.s2()?.verdict === 'done' ? ' products/Routes' : ' ???'
  );
  readonly routeClass = computed(() =>
    this.s2()?.verdict === 'done' ? 'ok' : 'bad'
  );

  readonly exposesLabel = computed(() => {
    const snap = this.snapshot();
    if (!snap.remote.reachable) return ' unreachable';
    if (snap.remote.exposes.length === 0) return ' publishes nothing';
    return ` ${snap.remote.exposes.join(' ')}`;
  });
  readonly exposesClass = computed(() =>
    this.snapshot().remote.exposes.length > 0 ? 'ok' : 'bad'
  );

  readonly scopeCount = computed(() => {
    const scope = this.snapshot().shareScope;
    if (!scope) return 'not negotiated yet';
    return `${scope.length} packages shared at runtime`;
  });

  private pkg(name: string) {
    return this.snapshot().shareScope?.find((p) => p.name === name) ?? null;
  }

  readonly coreLabel = computed(() => {
    const p = this.pkg('@angular/core');
    if (!p) return ' —';
    return p.strictVersion ? ' 1x + strict' : p.singleton ? ' 1x' : ' shared';
  });
  readonly coreClass = computed(() => {
    const p = this.pkg('@angular/core');
    if (!p) return 'dim';
    return p.strictVersion ? 'ok' : 'bad';
  });

  readonly authLabel = computed(() => {
    const p = this.pkg('@mf-lab/shared-auth');
    if (!p) return ' not shared';
    return p.singleton ? ' 1x' : ' shared';
  });
  readonly authClass = computed(() =>
    this.pkg('@mf-lab/shared-auth') ? 'ok' : 'bad'
  );

  readonly summary = computed(
    () =>
      `Shell host with a products remote. Remote ${this.remoteState()}, federation ${this.arrowState()}.`
  );
}
