import { CanActivateFn } from '@angular/router';

export const cookieConsentGuard: CanActivateFn = (route, state) => {
  return true;
};
