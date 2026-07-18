import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

export const cookieConsentGuard: CanActivateFn = (
  _route,
  state
) => {
  const router = inject(Router);

  const consentimiento = obtenerCookie(
    'kasq_cookie_consent'
  );

  if (consentimiento === 'aceptadas') {
    return true;
  }

  sessionStorage.setItem(
    'kasq_return_url',
    state.url
  );

  return router.createUrlTree(['/login']);
};

function obtenerCookie(nombre: string): string | null {
  const cookies = document.cookie.split(';');

  const cookieEncontrada = cookies.find((cookie) =>
    cookie
      .trim()
      .startsWith(`${nombre}=`)
  );

  if (!cookieEncontrada) {
    return null;
  }

  const partes = cookieEncontrada
    .trim()
    .split('=');

  return partes.length > 1
    ? decodeURIComponent(partes.slice(1).join('='))
    : null;
}