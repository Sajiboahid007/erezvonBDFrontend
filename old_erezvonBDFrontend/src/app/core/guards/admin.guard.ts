import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      const roleName = user?.Role?.Name || user?.role || '';
      if (roleName === 'Admin' || roleName === 'SuperAdmin') {
        return true;
      }
    } catch {
      // Invalid user JSON
    }
  }

  router.navigate(['/auth/login'], { queryParams: { error: 'unauthorized_admin' } });
  return false;
};
