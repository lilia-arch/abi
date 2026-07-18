import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';

import { Router } from '@angular/router';

import {
  catchError,
  throwError
} from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (
  request,
  next
) => {

  const router = inject(Router);

  const token =
    localStorage.getItem('token');

  let nuevaPeticion = request;

  if (
    token &&
    request.url.startsWith('/api')
  ) {

    nuevaPeticion =
      request.clone({

        setHeaders: {

          Authorization:
            `Bearer ${token}`

        }

      });

  }

  return next(nuevaPeticion).pipe(

    catchError(

      (error: HttpErrorResponse) => {

        if (
          error.status === 401 ||
          error.status === 403
        ) {

          localStorage.removeItem('token');

          router.navigate(['/']);

        }

        return throwError(() => error);

      }

    )

  );

};