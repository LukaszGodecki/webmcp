import { Component, computed, inject, input, output } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatIconButton } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { WebMcpActivityService } from '../webmcp/webmcp-activity.service';
import { Experience } from './application-form.model';

/** One work experience entry: job title + employment period (date range). */
@Component({
  selector: 'app-experience-item',
  imports: [FormField, MatInputModule, MatDatepickerModule, MatIconButton, MatIcon],
  template: `
    <fieldset class="experience" [class.agent-filled]="highlighted()">
      <legend>Doświadczenie {{ index() + 1 }}</legend>

      <div class="fields">
        <mat-form-field>
          <mat-label>Nazwa stanowiska</mat-label>
          <input matInput [formField]="item().position" autocomplete="organization-title" />
          @if (item().position().errors()[0]; as error) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Okres zatrudnienia</mat-label>
          <mat-date-range-input [rangePicker]="picker">
            <input matStartDate [formField]="item().from" placeholder="Od" />
            <input matEndDate [formField]="item().to" placeholder="Do" />
          </mat-date-range-input>
          <mat-hint>DD.MM.RRRR – DD.MM.RRRR</mat-hint>
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-date-range-picker #picker />
          @if (dateError(); as error) {
            <mat-error>{{ error }}</mat-error>
          }
        </mat-form-field>
      </div>

      <button
        mat-icon-button
        type="button"
        class="remove"
        [attr.aria-label]="'Usuń doświadczenie ' + (index() + 1)"
        (click)="remove.emit()"
      >
        <mat-icon aria-hidden="true">delete</mat-icon>
      </button>
    </fieldset>
  `,
  styles: `
    .experience {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0;
      padding: 12px 8px 4px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium);
    }
    legend {
      padding: 0 4px;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .fields {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0 16px;
    }
    .remove {
      margin-top: 4px;
    }
  `,
})
export class ExperienceItemComponent {
  readonly item = input.required<FieldTree<Experience>>();
  readonly index = input.required<number>();
  readonly remove = output();

  private readonly activity = inject(WebMcpActivityService);

  protected readonly highlighted = computed(() =>
    [...this.activity.highlighted()].some((path) => path.startsWith(`experience.${this.index()}.`)),
  );

  protected readonly dateError = computed(() => {
    const [error] = [...this.item().from().errors(), ...this.item().to().errors()];
    return error?.message;
  });
}
