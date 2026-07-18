import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

export const cookieConsentGuard: CanActivateFn = (
  route,
  state
) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);

  const consentimiento =
    cookieService.get('kasq_cookie_consent');

  const token =
    localStorage.getItem('token');

  // No aceptó las cookies
  if (consentimiento !== 'aceptadas') {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    return router.createUrlTree(
      ['/'],
      {
        queryParams: {
          motivo: 'cookies'
        }
      }
    );
  }

  // No existe una sesión válida
  if (token !== 'KASQ-TOKEN') {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    return router.createUrlTree(
      ['/'],
      {
        queryParams: {
          returnUrl: state.url
        }
      }
    );
  }

  return true;
};