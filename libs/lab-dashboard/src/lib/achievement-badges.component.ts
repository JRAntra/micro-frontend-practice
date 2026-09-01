import { Component, input } from '@angular/core';
import { ACHIEVEMENTS } from './achievements.data';

/**
 * The six badges, greyed until earned.
 *
 * Shared between the dashboard hero and the completion card, because the moment you
 * finish is the worst possible moment for the trophy case to disappear — and it did,
 * in the first version of this, since the completion card replaced the hero wholesale.
 */
@Component({
  selector: 'lab-achievement-badges',
  template: `
    <div class="badges" role="list" aria-label="Achievements">
      @for (a of achievements; track a.id) {
      <div
        class="badge"
        role="listitem"
        [class.earned]="earned().includes(a.id)"
        [attr.aria-label]="
          earned().includes(a.id) ? a.name + ' — ' + a.earnedFor : 'Locked'
        "
        [title]="earned().includes(a.id) ? a.earnedFor : 'Locked'"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path [attr.d]="a.glyph" />
        </svg>
        <span class="tiny">{{ earned().includes(a.id) ? a.name : '???' }}</span>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .badges {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: var(--gap-2);
        width: 100%;
      }
      .badge {
        display: grid;
        justify-items: center;
        gap: 4px;
        padding: var(--gap-3) var(--gap-2);
        border-radius: var(--r);
        border: 1px dashed var(--line-2);
        text-align: center;
        color: var(--ink-4);
        transition: color 0.3s var(--ease), border-color 0.3s var(--ease),
          background 0.3s var(--ease);
      }
      .badge svg {
        width: 26px;
        height: 26px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .badge.earned {
        border-style: solid;
        border-color: var(--good-line);
        background: var(--good-soft);
        color: var(--good);
        /* The one moment in the lab that deserves a flourish. */
        animation: unlock 0.5s var(--ease) both;
      }
      @keyframes unlock {
        from {
          transform: scale(0.86);
          opacity: 0.4;
        }
        60% {
          transform: scale(1.06);
        }
      }
      @media (max-width: 820px) {
        .badges {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class AchievementBadgesComponent {
  /** Step ids the learner has completed. */
  readonly earned = input.required<string[]>();
  readonly achievements = ACHIEVEMENTS;
}
