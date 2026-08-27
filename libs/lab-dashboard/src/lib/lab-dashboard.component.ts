import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { SessionStore } from '@mf-lab/shared-auth';
import { FederationDiagramComponent } from './federation-diagram.component';
import { LabProbeService, PRODUCTS_ORIGIN } from './lab-probe.service';

/**
 * The lab dashboard, mounted by the shell at /lab.
 *
 * Everything on this page is derived from live observation of the two running
 * applications — see lab-probe.service.ts. It is a mirror, not a grader: `npm test`
 * is the independent check, and the two agreeing is the signal you want.
 */
@Component({
  selector: 'lab-dashboard',
  imports: [FederationDiagramComponent],
  template: `
    <div class="lab">
      <header>
        <h1>Lab dashboard</h1>
        <p class="lede">
          Live view of what your two applications are actually doing, re-checked
          every two seconds. Component and template edits show up here on save.
          Edits to a
          <code>module-federation.config.ts</code> do not — that file is read
          when the dev server builds, so restart the affected server to see
          those.
        </p>
      </header>

      <section class="score">
        <div
          class="bar"
          [attr.aria-label]="
            snap().points + ' of ' + snap().maxPoints + ' points'
          "
        >
          <span
            class="fill"
            [style.width.%]="(snap().points / snap().maxPoints) * 100"
          ></span>
        </div>
        <div class="tally">
          <strong>{{ snap().points }}</strong> / {{ snap().maxPoints }} points ·
          {{ snap().doneCount }} of {{ snap().steps.length }} steps ·
          <span [class]="snap().requiredComplete ? 'ok' : 'bad'">
            required track
            {{ snap().requiredComplete ? 'complete' : 'not complete' }}
          </span>
          <span class="dim"> · check #{{ snap().tick }}</span>
        </div>
      </section>

      @if (!snap().remote.reachable) {
      <p class="banner">
        The products remote is not answering on <code>{{ productsOrigin }}</code
        >. Start it in a second terminal with
        <code>npm run start:remote</code> — most of this page stays blank until
        it is up.
      </p>
      }

      <section>
        <h2>What is wired up</h2>
        <lab-federation-diagram [snapshot]="snap()" />
      </section>

      <section>
        <h2>Steps</h2>
        <ol class="steps">
          @for (s of snap().steps; track s.step.id) {
          <li [class]="s.verdict">
            <span class="glyph" aria-hidden="true">{{ glyph(s.verdict) }}</span>
            <span class="body">
              <span class="head">
                <strong>{{ s.step.n }}. {{ s.step.title }}</strong>
                <span class="tag">{{
                  s.step.required ? 'required' : '+' + s.step.points
                }}</span>
              </span>
              <span class="detail">{{ s.detail }}</span>
              @if (s.next) {
              <span class="next">→ {{ s.next }}</span>
              }
              <span class="doc"
                ><code>{{ s.step.doc }}</code></span
              >
            </span>
          </li>
          }
        </ol>
      </section>

      <section>
        <h2>Session store instances</h2>
        <p class="lede">
          Every copy of <code>SessionStore</code> that has been constructed in
          this tab. One means the shell and the remote share it. Two means they
          each bundled their own, and signing in on the shell will never reach
          the remote.
        </p>
        @if (!snap().session.remoteSeen) {
        <p class="hint">
          Only the shell has built a store so far. Open the
          <strong>Products</strong> page once so the remote builds its own, then
          come back.
        </p>
        }
        <ul class="chips">
          @for (id of snap().session.ids; track id) {
          <li
            [class]="snap().session.ids.length === 1 ? 'chip ok' : 'chip bad'"
          >
            <code>{{ id }}</code>
            @if (id === shellInstanceId) {
            <span class="who">shell</span>
            } @else {
            <span class="who">remote</span>
            }
          </li>
          } @if (snap().session.ids.length === 0) {
          <li class="chip dim">none yet</li>
          }
        </ul>
      </section>

      <section>
        <h2>Live share scope</h2>
        <p class="lede">
          The actual runtime negotiation between the two applications. This
          table is what steps 3 and 5 are about — and
          <code>strictVersion</code> appears nowhere else, not even in the built
          <code>mf-manifest.json</code>. Note that Nx sets sensible defaults
          here before you write anything, so a green flag is not by itself
          evidence that you chose it. This dashboard's own library is filtered
          out.
        </p>
        @if (snap().shareScope === null) {
        <p class="hint">
          Nothing negotiated yet. The share scope fills in once the shell
          actually loads the remote, so this stays empty until step 2 is done.
        </p>
        } @else {
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th>package</th>
                <th>version</th>
                <th>singleton</th>
                <th>strictVersion</th>
                <th>provided by</th>
                <th>used by</th>
              </tr>
            </thead>
            <tbody>
              @for (p of snap().shareScope; track p.name) {
              <tr [class.highlight]="isKeyPackage(p.name)">
                <td>
                  <code>{{ p.name }}</code>
                </td>
                <td>
                  {{ p.version || '—' }}
                  @if (p.versionCount > 1) {
                  <span class="warn">{{ p.versionCount }} versions</span>
                  }
                </td>
                <td [class]="p.singleton ? 'ok' : 'dim'">
                  {{ p.singleton ? 'yes' : 'no' }}
                </td>
                <td [class]="p.strictVersion ? 'ok' : 'dim'">
                  {{ p.strictVersion ? 'yes' : 'no' }}
                </td>
                <td>{{ p.providedBy || '—' }}</td>
                <td>{{ p.usedBy.join(', ') || '—' }}</td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
      </section>

      <section>
        <h2>Blast radius</h2>
        <p class="lede">
          One remote going down is the failure mode microfrontends introduce,
          and the sixth design question asks you to describe it from observation
          rather than intuition. So observe it:
        </p>
        <ol class="numbered">
          <li>Finish step 2, so the shell genuinely loads the remote.</li>
          <li>
            Stop the products dev server — <kbd>Ctrl</kbd>+<kbd>C</kbd> in the
            terminal running <code>npm run start:remote</code>.
          </li>
          <li>
            Watch this page: the remote box goes red within two seconds. Then
            navigate around the shell and note precisely what still works and
            what does not.
          </li>
          <li>
            Start it again, and write down what you saw in
            <code>DESIGN.md</code>.
          </li>
        </ol>
        <p class="status">
          Right now: remote is
          <strong [class]="snap().remote.reachable ? 'ok' : 'bad'">{{
            snap().remote.reachable ? 'up' : 'down'
          }}</strong
          >@if (snap().remote.error) {
          <span class="dim"> ({{ snap().remote.error }})</span>
          }
        </p>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        --lab-text: #1c1c1c;
        --lab-text-dim: #6b6b6b;
        --lab-line: #d8d8d8;
        --lab-line-strong: #9a9a9a;
        --lab-surface: #ffffff;
        --lab-surface-dim: #f4f4f4;
        --lab-ok: #1a7f45;
        --lab-ok-bg: #eef8f1;
        --lab-bad: #b3261e;
        --lab-bad-bg: #fdeeed;
        --lab-warn: #8a6100;

        display: block;
        font-family: system-ui, sans-serif;
        color: var(--lab-text);
      }
      .lab {
        max-width: 820px;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 4px;
      }
      h2 {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--lab-text-dim);
        margin: 0 0 8px;
      }
      section {
        margin-top: 28px;
      }
      .lede,
      .hint,
      .status {
        font-size: 13px;
        color: var(--lab-text-dim);
        margin: 0 0 12px;
        line-height: 1.5;
      }
      .hint {
        background: var(--lab-surface-dim);
        border-radius: 6px;
        padding: 8px 10px;
      }
      .banner {
        margin-top: 20px;
        border: 1px solid var(--lab-bad);
        background: var(--lab-bad-bg);
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.5;
      }
      code,
      kbd {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.92em;
      }
      kbd {
        border: 1px solid var(--lab-line);
        border-radius: 4px;
        padding: 0 4px;
      }

      .score .bar {
        height: 8px;
        border-radius: 4px;
        background: var(--lab-surface-dim);
        overflow: hidden;
      }
      .score .fill {
        display: block;
        height: 100%;
        background: var(--lab-ok);
        transition: width 0.4s ease;
      }
      .tally {
        margin-top: 8px;
        font-size: 13px;
      }

      ol.steps {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      ol.steps li {
        display: flex;
        gap: 10px;
        border: 1px solid var(--lab-line);
        border-radius: 8px;
        padding: 10px 12px;
        background: var(--lab-surface);
      }
      ol.steps li.done {
        border-color: var(--lab-ok);
        background: var(--lab-ok-bg);
      }
      ol.steps li.unknown {
        opacity: 0.7;
      }
      .glyph {
        font-family: ui-monospace, monospace;
        flex: 0 0 auto;
        white-space: nowrap;
        color: var(--lab-text-dim);
      }
      li.done .glyph {
        color: var(--lab-ok);
      }
      li.todo .glyph {
        color: var(--lab-bad);
      }
      .body {
        display: grid;
        gap: 3px;
        font-size: 13px;
        line-height: 1.45;
      }
      .head {
        display: flex;
        gap: 8px;
        align-items: baseline;
      }
      .tag {
        font-size: 11px;
        color: var(--lab-text-dim);
        border: 1px solid var(--lab-line);
        border-radius: 4px;
        padding: 0 4px;
      }
      .detail {
        color: var(--lab-text);
      }
      .next {
        color: var(--lab-warn);
      }
      .doc {
        font-size: 11px;
        color: var(--lab-text-dim);
      }

      ul.chips {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0;
        margin: 0;
      }
      .chip {
        display: flex;
        gap: 6px;
        align-items: baseline;
        border: 1px solid var(--lab-line);
        border-radius: 6px;
        padding: 5px 9px;
        font-size: 13px;
      }
      .chip.ok {
        border-color: var(--lab-ok);
        background: var(--lab-ok-bg);
      }
      .chip.bad {
        border-color: var(--lab-bad);
        background: var(--lab-bad-bg);
      }
      .who {
        font-size: 11px;
        color: var(--lab-text-dim);
      }

      .scroll {
        overflow-x: auto;
      }
      table {
        border-collapse: collapse;
        font-size: 12px;
        min-width: 560px;
      }
      th,
      td {
        text-align: left;
        padding: 5px 12px 5px 0;
        border-bottom: 1px solid var(--lab-line);
        white-space: nowrap;
      }
      th {
        font-weight: 600;
        color: var(--lab-text-dim);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      tr.highlight td {
        background: var(--lab-surface-dim);
      }
      .warn {
        color: var(--lab-bad);
        margin-left: 6px;
      }

      ol.numbered {
        font-size: 13px;
        line-height: 1.6;
        padding-left: 20px;
        margin: 0 0 12px;
      }

      .ok {
        color: var(--lab-ok);
      }
      .bad {
        color: var(--lab-bad);
      }
      .dim {
        color: var(--lab-text-dim);
      }
    `,
  ],
})
export class LabDashboardComponent implements OnInit, OnDestroy {
  private readonly probe = inject(LabProbeService);
  readonly snap = computed(() => this.probe.snapshot());
  readonly productsOrigin = PRODUCTS_ORIGIN;

  /** The shell's own store id, so the chips can say which side each one came from. */
  readonly shellInstanceId = inject(SessionStore).instanceId;

  ngOnInit(): void {
    this.probe.start();
  }

  ngOnDestroy(): void {
    this.probe.release();
  }

  glyph(verdict: string): string {
    return verdict === 'done' ? '[x]' : verdict === 'todo' ? '[ ]' : '[?]';
  }

  isKeyPackage(name: string): boolean {
    return name === '@angular/core' || name === '@mf-lab/shared-auth';
  }
}
