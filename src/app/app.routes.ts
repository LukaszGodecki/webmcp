import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Formularz zgłoszeniowy · WebMCP demo',
    loadComponent: () =>
      import('./application-form/application-form.page').then((m) => m.ApplicationFormPage),
  },
  { path: '**', redirectTo: '' },
];
