import { Injectable, inject } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  MAT_NATIVE_DATE_FORMATS,
  MatDateFormats,
  NativeDateAdapter,
} from '@angular/material/core';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
const INVALID = 'Invalid Date';

/** Formats a `Date` as a local `YYYY-MM-DD` string (no timezone shift). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a strict `YYYY-MM-DD` string into a local `Date`, or `null` when invalid. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = value ? ISO_DATE.exec(value) : null;
  return match ? buildDate(+match[1], +match[2], +match[3]) : null;
}

function buildDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  const roundTrips =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return roundTrips ? date : null;
}

/**
 * Material `DateAdapter` that stores dates as ISO `YYYY-MM-DD` strings.
 *
 * Signal Forms infer the WebMCP tool schema from the form value, and a `Date` object
 * cannot be described as JSON. Keeping dates as strings makes the schema `"type": "string"`
 * and lets an AI agent pass dates directly. Calendar logic is delegated to `NativeDateAdapter`.
 */
@Injectable()
export class IsoDateAdapter extends DateAdapter<string> {
  private readonly native = new NativeDateAdapter();

  constructor() {
    super();
    this.setLocale(inject(MAT_DATE_LOCALE));
  }

  override setLocale(locale: unknown): void {
    super.setLocale(locale);
    this.native?.setLocale(locale);
  }

  getYear(date: string): number {
    return this.toDate(date).getFullYear();
  }
  getMonth(date: string): number {
    return this.toDate(date).getMonth();
  }
  getDate(date: string): number {
    return this.toDate(date).getDate();
  }
  getDayOfWeek(date: string): number {
    return this.toDate(date).getDay();
  }
  getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.native.getMonthNames(style);
  }
  getDateNames(): string[] {
    return this.native.getDateNames();
  }
  getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.native.getDayOfWeekNames(style);
  }
  getYearName(date: string): string {
    return this.native.getYearName(this.toDate(date));
  }
  getFirstDayOfWeek(): number {
    return 1; // Monday (pl-PL)
  }
  getNumDaysInMonth(date: string): number {
    return this.native.getNumDaysInMonth(this.toDate(date));
  }
  clone(date: string): string {
    return date;
  }
  createDate(year: number, month: number, date: number): string {
    return toIsoDate(this.native.createDate(year, month, date));
  }
  today(): string {
    return toIsoDate(this.native.today());
  }

  parse(value: unknown): string | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? INVALID : toIsoDate(value);
    }
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    const text = value.trim();
    if (ISO_DATE.test(text)) {
      return parseIsoDate(text) ? text : INVALID;
    }
    const local = LOCAL_DATE.exec(text);
    const date = local ? buildDate(+local[3], +local[2], +local[1]) : null;
    return date ? toIsoDate(date) : INVALID;
  }

  format(date: string, displayFormat: object): string {
    if (!this.isValid(date)) {
      throw Error('IsoDateAdapter: Cannot format invalid date.');
    }
    return this.native.format(this.toDate(date), displayFormat);
  }

  addCalendarYears(date: string, years: number): string {
    return toIsoDate(this.native.addCalendarYears(this.toDate(date), years));
  }
  addCalendarMonths(date: string, months: number): string {
    return toIsoDate(this.native.addCalendarMonths(this.toDate(date), months));
  }
  addCalendarDays(date: string, days: number): string {
    return toIsoDate(this.native.addCalendarDays(this.toDate(date), days));
  }
  toIso8601(date: string): string {
    return date;
  }

  override deserialize(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    return typeof value === 'string' && this.isValid(value) ? value : this.invalid();
  }

  isDateInstance(obj: unknown): boolean {
    return typeof obj === 'string';
  }
  isValid(date: string): boolean {
    return parseIsoDate(date) !== null;
  }
  invalid(): string {
    return INVALID;
  }

  private toDate(date: string): Date {
    return parseIsoDate(date) ?? new Date(NaN);
  }
}

/** Parse `dd.MM.yyyy` (and ISO), display using Intl in the active locale. */
export const ISO_DATE_FORMATS: MatDateFormats = {
  ...MAT_NATIVE_DATE_FORMATS,
  parse: { dateInput: 'dd.MM.yyyy' },
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
  },
};
