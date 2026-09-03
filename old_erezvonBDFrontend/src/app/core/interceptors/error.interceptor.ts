import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService, { optional: true });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show toast for 401 (auth), background GET queries, or requests with X-Skip-Error-Toast
      const isGetRequest = req.method === 'GET';
      const skipToast = req.headers.has('X-Skip-Error-Toast');

      if (!skipToast && messageService && error.status !== 401 && !isGetRequest) {
        let errorMessage = 'An unexpected error occurred.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.statusText) {
          errorMessage = `${error.status}: ${error.statusText}`;
        }

        messageService.add({
          severity: 'error',
          summary: `Request Error`,
          detail: errorMessage,
          life: 4000,
        });
      }

      return throwError(() => error);
    })
  );
};
