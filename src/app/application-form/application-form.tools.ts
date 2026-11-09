import { WritableSignal, inject } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { declareLoggedTool } from '../webmcp/declare-logged-tool';
import { WebMcpActivityService } from '../webmcp/webmcp-activity.service';
import {
  ApplicationForm,
  PersonalDetails,
  emptyExperience,
  initialValue,
  isExperienceEmpty,
} from './application-form.model';

type ApplicationFieldTree = FieldTree<ApplicationForm>;

const PERSONAL_KEYS = ['firstName', 'lastName', 'birthDate', 'street', 'city'] as const;
const EXPERIENCE_KEYS = ['position', 'from', 'to'] as const;

const DATE_HINT = 'Date in ISO format YYYY-MM-DD.';

/** Every leaf field of the form with its dot-separated path, e.g. `experience.0.from`. */
export function leafFields(form: ApplicationFieldTree): [string, FieldTree<unknown>][] {
  const personal = PERSONAL_KEYS.map((key): [string, FieldTree<unknown>] => [key, form[key]]);
  const experience = form()
    .value()
    .experience.flatMap((_, i) =>
      EXPERIENCE_KEYS.map((key): [string, FieldTree<unknown>] => [
        `experience.${i}.${key}`,
        form.experience[i][key],
      ]),
    );
  return [...personal, ...experience];
}

function validationErrors(form: ApplicationFieldTree, pathPrefix = ''): string[] {
  return leafFields(form)
    .filter(([path]) => path.startsWith(pathPrefix))
    .flatMap(([path, field]) =>
      field()
        .errors()
        .map((error) => `${path}: ${error.message ?? error.kind}`),
    );
}

function touch(form: ApplicationFieldTree, paths: readonly string[]): void {
  for (const [path, field] of leafFields(form)) {
    if (paths.includes(path)) {
      field().markAsTouched();
    }
  }
}

function textResult(...lines: string[]) {
  return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
}

function errorsSection(errors: string[]): string {
  return errors.length
    ? `Validation errors (fix them before submitting):\n${errors.join('\n')}`
    : 'No validation errors.';
}

/**
 * Declares fine-grained WebMCP tools for the job application form. They complement the
 * `submit_job_application` tool that Signal Forms generate automatically from the form.
 *
 * Must be called in the injection context of the component that owns the form.
 */
export function registerApplicationFormTools(
  form: ApplicationFieldTree,
  model: WritableSignal<ApplicationForm>,
): void {
  const activity = inject(WebMcpActivityService);

  declareLoggedTool({
    name: 'get_application_form_state',
    title: 'Get application form state',
    description:
      'Returns the current values of the job application form, whether it is valid and the list ' +
      'of validation errors. Call it before filling or submitting the form.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => {
      const state = {
        value: model(),
        valid: form().valid(),
        errors: validationErrors(form),
      };
      return textResult(JSON.stringify(state, null, 2));
    },
  });

  declareLoggedTool({
    name: 'fill_personal_details',
    title: 'Fill personal details',
    description:
      'Fills the personal details section of the job application form (first name, last name, ' +
      'birth date and home address). Only the provided fields are changed. Does not submit the form.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'First name of the candidate.' },
        lastName: { type: 'string', description: 'Last name of the candidate.' },
        birthDate: { type: 'string', description: `Birth date. ${DATE_HINT}` },
        street: {
          type: 'string',
          description: 'Street and house number, e.g. "Marszałkowska 10/5".',
        },
        city: { type: 'string', description: 'City of residence.' },
      },
    },
    execute: (args) => {
      const patch: Partial<PersonalDetails> = {};
      for (const key of PERSONAL_KEYS) {
        const value = args[key];
        if (typeof value === 'string') {
          patch[key] = value.trim();
        }
      }
      const changed = Object.keys(patch);
      if (!changed.length) {
        return textResult('No fields provided. Pass at least one of: ' + PERSONAL_KEYS.join(', '));
      }
      model.update((value) => ({ ...value, ...patch }));
      touch(form, changed);
      activity.highlight(changed);
      return textResult(
        `Updated fields: ${changed.join(', ')}.`,
        errorsSection(validationErrors(form)),
      );
    },
  });

  declareLoggedTool({
    name: 'add_work_experience',
    title: 'Add work experience',
    description:
      'Adds one entry to the work experience list of the job application form. ' +
      'If the list only contains an empty placeholder entry, that entry is replaced. ' +
      'Call it once per job.',
    inputSchema: {
      type: 'object',
      properties: {
        position: { type: 'string', description: 'Job title, e.g. "Senior Frontend Developer".' },
        from: { type: 'string', description: `Start date of the job. ${DATE_HINT}` },
        to: {
          type: 'string',
          description: `End date of the job, not earlier than "from". ${DATE_HINT}`,
        },
      },
      required: ['position', 'from', 'to'],
    },
    execute: ({ position, from, to }) => {
      const entry = { ...emptyExperience(), position: position.trim(), from, to };
      const current = model().experience;
      const replacePlaceholder = current.length === 1 && isExperienceEmpty(current[0]);
      const index = replacePlaceholder ? 0 : current.length;

      model.update((value) => ({
        ...value,
        experience: replacePlaceholder ? [entry] : [...value.experience, entry],
      }));

      const prefix = `experience.${index}.`;
      const paths = EXPERIENCE_KEYS.map((key) => prefix + key);
      touch(form, paths);
      activity.highlight(paths);
      return textResult(
        `Work experience added at index ${index}.`,
        errorsSection(validationErrors(form, prefix)),
      );
    },
  });

  declareLoggedTool({
    name: 'remove_work_experience',
    title: 'Remove work experience',
    description:
      'Removes the work experience entry at the given zero-based index. ' +
      'Use get_application_form_state to find the index. ' +
      'Removing the last remaining entry clears it instead.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'integer', minimum: 0, description: 'Zero-based index of the entry.' },
      },
      required: ['index'],
    },
    execute: ({ index }) => {
      const count = model().experience.length;
      if (!Number.isInteger(index) || index < 0 || index >= count) {
        return textResult(`Invalid index ${index}. Valid indexes: 0..${count - 1}.`);
      }
      model.update((value) => ({
        ...value,
        experience:
          count === 1 ? [emptyExperience()] : value.experience.filter((_, i) => i !== index),
      }));
      return textResult(
        count === 1
          ? 'The only work experience entry was cleared.'
          : `Work experience at index ${index} removed. ${count - 1} entries left.`,
      );
    },
  });

  declareLoggedTool({
    name: 'clear_application_form',
    title: 'Clear application form',
    description: 'Clears all fields of the job application form and resets its validation state.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      form().reset(initialValue());
      return textResult('The form was cleared.');
    },
  });
}
