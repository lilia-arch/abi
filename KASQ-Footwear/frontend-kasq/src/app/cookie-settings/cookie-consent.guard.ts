import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

export const cookieConsentGuard: CanActivateFn = (
  route,
  state
) => {
  const router = inject(Router);

  const cookies = document.cookie.split(';');

  const consentimiento = cookies.find((cookie) =>
    cookie
      .trim()
      .startsWith('kasq_cookie_consent=')
  );

  const decision = consentimiento
    ?.trim()
    .split('=')[1];

  if (decision === 'aceptadas') {
    return true;
  }

  sessionStorage.setItem(
    'kasq_return_url',
    state.url
  );

  return router.createUrlTree(['/login']);
};