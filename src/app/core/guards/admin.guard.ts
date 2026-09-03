import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      const roleName = (user?.Role?.Name || user?.Roles?.Name || user?.role || '').toLowerCase();
      if (roleName === 'admin' || roleName === 'superadmin' || user?.RoleId === 1 || user?.RoleId === 2) {
        return true;
      }
    } catch {
      // Invalid user JSON
    }
  }

  router.navigate(['/auth/login'], { queryParams: { error: 'unauthorized_admin' } });
  return false;
};
