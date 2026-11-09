import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { WebMcpActivityService } from './webmcp-activity.service';

/** Demo side panel: WebMCP support status, exposed tools and a live log of agent calls. */
@Component({
  selector: 'app-webmcp-panel',
  imports: [DatePipe, JsonPipe, MatButton, MatCardModule, MatIcon],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header>
        <mat-card-title><h2>WebMCP</h2></mat-card-title>
        <mat-card-subtitle>Narzędzia udostępnione agentom AI przez tę stronę</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        @if (activity.supported) {
          <div class="status ok">
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            <div>
              <p>
                Wykryto API WebMCP: <code>{{ activity.apiLocation }}</code
                >.
              </p>
              <p>
                @if (activity.confirmed(); as confirmed) {
                  Przeglądarka potwierdza {{ confirmed.size }} z
                  {{ activity.tools().length }} narzędzi (<code>getTools()</code>).
                } @else {
                  Narzędzia przekazane do <code>registerTool()</code>
                  @if (activity.failed().size) {
                    – {{ activity.failed().size }} z błędem.
                  } @else {
                    bez błędów.
                  }
                }
              </p>
            </div>
          </div>
        } @else {
          <div class="status warn">
            <mat-icon aria-hidden="true">info</mat-icon>
            <div>
              <p>
                WebMCP niedostępne w tej przeglądarce. Formularz działa normalnie, ale agent go nie
                zobaczy.
              </p>
              <p>
                Włącz flagę <strong>„WebMCP for testing”</strong> w <code>chrome://flags</code>
                (Chrome 146+) i zainstaluj rozszerzenie
                <strong>Model Context Tool Inspector</strong>.
              </p>
            </div>
          </div>
        }

        <h3>Narzędzia ({{ activity.tools().length }})</h3>
        <ul class="tools">
          @for (tool of activity.tools(); track tool.name) {
            <li>
              <div class="tool-name">
                <code>{{ tool.name }}</code>
                <span class="badge" [class.form]="tool.kind === 'form'">
                  {{ tool.kind === 'form' ? 'Signal Forms' : 'ręczne' }}
                </span>
                @if (activity.failed().get(tool.name); as error) {
                  <span class="badge failed" [title]="error">błąd rejestracji</span>
                } @else if (activity.confirmed()?.has(tool.name)) {
                  <span class="badge confirmed">potwierdzone</span>
                }
              </div>
              <p class="description">{{ tool.description }}</p>
            </li>
          }
        </ul>

        <div class="log-header">
          <h3 id="log-title">Log wywołań</h3>
          @if (activity.log().length) {
            <button matButton="text" type="button" (click)="activity.clearLog()">
              Wyczyść log
            </button>
          }
        </div>
        <div class="log" role="log" tabindex="0" aria-live="polite" aria-labelledby="log-title">
          @for (entry of activity.log(); track entry.id) {
            <article class="entry" [class]="entry.status">
              <header>
                <mat-icon aria-hidden="true">{{ statusIcon[entry.status] }}</mat-icon>
                <code>{{ entry.tool }}</code>
                <time>{{ entry.time | date: 'HH:mm:ss' }}</time>
                <span class="visually-hidden">{{ statusLabel[entry.status] }}</span>
              </header>
              <details>
                <summary>Argumenty</summary>
                <pre tabindex="0" aria-label="Argumenty wywołania">{{ entry.args | json }}</pre>
              </details>
              @if (entry.result) {
                <pre class="result" tabindex="0" aria-label="Wynik wywołania">{{
                  entry.result
                }}</pre>
              }
            </article>
          } @empty {
            <p class="empty">Brak wywołań. Poproś agenta o wypełnienie formularza.</p>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0;
      font: var(--mat-sys-headline-small);
    }
    h3 {
      margin: 20px 0 8px;
      font: var(--mat-sys-title-small);
    }
    p {
      margin: 0;
    }
    .status {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-top: 12px;
      padding: 12px;
      border-radius: var(--mat-sys-corner-small);
      font: var(--mat-sys-body-medium);
    }
    .status p + p {
      margin-top: 8px;
    }
    .status.ok {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .status.warn {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .tools {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tool-name {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      padding: 2px 8px;
      border-radius: var(--mat-sys-corner-full);
      font: var(--mat-sys-label-small);
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .badge.form {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    .badge.failed {
      background: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
    }
    .badge.confirmed {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .description {
      margin-top: 4px;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .log-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .log {
      max-height: 45vh;
      overflow: auto;
      border-radius: var(--mat-sys-corner-extra-small);
    }
    .entry {
      margin-bottom: 8px;
      padding: 8px 12px;
      border-left: 4px solid var(--mat-sys-outline);
      border-radius: var(--mat-sys-corner-extra-small);
      background: var(--mat-sys-surface-container);
      animation: appear 300ms ease-out;
    }
    .entry.success {
      border-left-color: var(--mat-sys-primary);
    }
    .entry.error {
      border-left-color: var(--mat-sys-error);
    }
    .entry header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .entry time {
      margin-left: auto;
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .entry.error mat-icon {
      color: var(--mat-sys-error);
    }
    pre {
      margin: 4px 0 0;
      padding: 8px;
      max-height: 200px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
      background: var(--mat-sys-surface-container-highest);
      border-radius: var(--mat-sys-corner-extra-small);
    }
    summary {
      margin-top: 4px;
      cursor: pointer;
      font: var(--mat-sys-label-medium);
    }
    .empty {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    @keyframes appear {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .entry {
        animation: none;
      }
    }
  `,
})
export class WebMcpPanelComponent {
  protected readonly activity = inject(WebMcpActivityService);

  protected readonly statusIcon = { running: 'hourglass_top', success: 'check', error: 'error' };
  protected readonly statusLabel = { running: 'w toku', success: 'sukces', error: 'błąd' };
}
