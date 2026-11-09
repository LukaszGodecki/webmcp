import { applyEach, minLength, required, schema, validate } from '@angular/forms/signals';
import { parseIsoDate, toIsoDate } from '../core/iso-date-adapter';
import { ApplicationForm, IsoDate } from './application-form.model';

const MIN_AGE = 16;

function invalidDate(value: IsoDate) {
  return value && !parseIsoDate(value)
    ? { kind: 'invalidDate', message: 'Nieprawidłowa data (oczekiwany format RRRR-MM-DD)' }
    : undefined;
}

function today(): string {
  return toIsoDate(new Date());
}

export const applicationSchema = schema<ApplicationForm>((p) => {
  required(p.firstName, { message: 'Imię jest wymagane' });
  minLength(p.firstName, 2, { message: 'Imię musi mieć co najmniej 2 znaki' });

  required(p.lastName, { message: 'Nazwisko jest wymagane' });
  minLength(p.lastName, 2, { message: 'Nazwisko musi mieć co najmniej 2 znaki' });

  required(p.birthDate, { message: 'Data urodzenia jest wymagana' });
  validate(p.birthDate, ({ value }) => {
    const birthDate = value();
    const error = invalidDate(birthDate);
    if (error || !birthDate) {
      return error;
    }
    if (birthDate > today()) {
      return { kind: 'futureDate', message: 'Data urodzenia nie może być w przyszłości' };
    }
    const [year, rest] = [Number(birthDate.slice(0, 4)), birthDate.slice(4)];
    if (`${year + MIN_AGE}${rest}` > today()) {
      return { kind: 'tooYoung', message: `Kandydat musi mieć co najmniej ${MIN_AGE} lat` };
    }
    return undefined;
  });

  required(p.street, { message: 'Ulica jest wymagana' });
  required(p.city, { message: 'Miasto jest wymagane' });

  applyEach(p.experience, (e) => {
    required(e.position, { message: 'Nazwa stanowiska jest wymagana' });
    required(e.from, { message: 'Data rozpoczęcia jest wymagana' });
    required(e.to, { message: 'Data zakończenia jest wymagana' });

    validate(e.from, ({ value }) => {
      const from = value();
      return (
        invalidDate(from) ??
        (from && from > today()
          ? { kind: 'futureDate', message: 'Data rozpoczęcia nie może być w przyszłości' }
          : undefined)
      );
    });
    validate(e.to, ({ value, valueOf }) => {
      const to = value();
      const from = valueOf(e.from);
      return (
        invalidDate(to) ??
        (to && from && to < from
          ? {
              kind: 'dateRange',
              message: 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia',
            }
          : undefined)
      );
    });
  });
});
