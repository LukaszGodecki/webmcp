/**
 * Dates are ISO `YYYY-MM-DD` strings. Material pickers write `null` when cleared,
 * but the initial value must be `''` – Signal Forms infer the WebMCP schema from it
 * and cannot describe `null`.
 */
export type IsoDate = string | null;

export interface Experience {
  position: string;
  from: IsoDate;
  to: IsoDate;
}

export interface ApplicationForm {
  firstName: string;
  lastName: string;
  birthDate: IsoDate;
  street: string;
  city: string;
  experience: Experience[];
}

export type PersonalDetails = Omit<ApplicationForm, 'experience'>;

export function emptyExperience(): Experience {
  return { position: '', from: '', to: '' };
}

export function isExperienceEmpty(experience: Experience): boolean {
  return !experience.position && !experience.from && !experience.to;
}

/**
 * The experience list starts with one empty entry: the WebMCP schema for arrays
 * is inferred from the first item, so an empty array cannot be described.
 */
export function initialValue(): ApplicationForm {
  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    street: '',
    city: '',
    experience: [emptyExperience()],
  };
}
