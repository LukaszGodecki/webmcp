import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { WebMcpActivityService } from '../webmcp/webmcp-activity.service';
import { WebMcpPanelComponent } from '../webmcp/webmcp-panel.component';
import { ApplicationForm, emptyExperience, initialValue } from './application-form.model';
import { applicationSchema } from './application-form.schema';
import { leafFields, registerApplicationFormTools } from './application-form.tools';
import { ExperienceItemComponent } from './experience-item.component';

const SUBMIT_TOOL = {
  name: 'submit_job_application',
  description:
    'Fills the WHOLE job application form with the given data and submits it. ' +
    'All dates (birthDate, experience[].from, experience[].to) must be ISO strings YYYY-MM-DD. ' +
    '"experience" lists every job of the candidate (at least one), "to" must not be earlier ' +
    'than "from". Returns validation errors when the data is invalid.',
};

interface Submission {
  value: ApplicationForm;
  viaAgent: boolean;
  at: Date;
}

@Component({
  selector: 'app-application-form-page',
  imports: [
    DatePipe,
    FormField,
    FormRoot,
    MatButton,
    MatCardModule,
    MatDatepickerModule,
    MatIcon,
    MatInputModule,
    ExperienceItemComponent,
    WebMcpPanelComponent,
  ],
  templateUrl: './application-form.page.html',
  styleUrl: './application-form.page.scss',
})
export class ApplicationFormPage {
  private readonly activity = inject(WebMcpActivityService);

  protected readonly model = signal(initialValue());
  protected readonly submitted = signal<Submission | null>(null);

  /**
   * `experimentalWebMcpTool` turns the whole form into a WebMCP tool: Angular infers the
   * JSON schema from the model, and on invocation sets the value and calls `submit()`.
   */
  protected readonly form = form(this.model, applicationSchema, {
    name: 'application',
    experimentalWebMcpTool: { ...SUBMIT_TOOL, annotations: { consequentialHint: true } },
    submission: {
      action: async (field) => {
        const value = structuredClone(field().value());
        const viaAgent = this.logAgentSubmission(value, 'success', 'Form submitted successfully.');
        if (viaAgent) {
          this.activity.highlight(leafFields(this.form).map(([path]) => path));
        }
        this.submitted.set({ value, viaAgent, at: new Date() });
        return undefined;
      },
      onInvalid: (field) => {
        const errors = field()
          .errorSummary()
          .map((error) => error.message ?? error.kind);
        const viaAgent = this.logAgentSubmission(
          field().value(),
          'error',
          `Form submission failed:\n${errors.join('\n')}`,
        );
        if (!viaAgent) {
          field().errorSummary()[0]?.fieldTree().focusBoundControl();
        }
      },
    },
  });

  constructor() {
    this.activity.addTool({ ...SUBMIT_TOOL, kind: 'form' });
    inject(DestroyRef).onDestroy(() => this.activity.removeTool(SUBMIT_TOOL.name));

    registerApplicationFormTools(this.form, this.model);
  }

  protected isHighlighted(path: string): boolean {
    return this.activity.highlighted().has(path);
  }

  protected addExperience(): void {
    this.model.update((value) => ({
      ...value,
      experience: [...value.experience, emptyExperience()],
    }));
  }

  protected removeExperience(index: number): void {
    this.model.update((value) => ({
      ...value,
      experience:
        value.experience.length === 1
          ? [emptyExperience()]
          : value.experience.filter((_, i) => i !== index),
    }));
  }

  protected clear(): void {
    this.form().reset(initialValue());
    this.submitted.set(null);
  }

  /** Adds a log entry when the submission was triggered by the agent through the generated tool. */
  private logAgentSubmission(
    value: ApplicationForm,
    status: 'success' | 'error',
    result: string,
  ): boolean {
    const viaAgent = this.activity.consumeActivation(SUBMIT_TOOL.name);
    if (viaAgent) {
      const id = this.activity.start(SUBMIT_TOOL.name, value);
      this.activity.finish(id, status, result);
    }
    return viaAgent;
  }
}
