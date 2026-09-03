import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import {
  AuthResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
  User,
  UserQueryParams,
  UserUpdateDto,
  VerifyOtpDto,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';

  currentUserSignal = signal<User | null>(this.getStoredUser());
  tokenSignal = signal<string | null>(localStorage.getItem('token'));

  isAuthenticated = computed(() => !!this.tokenSignal());
  isAdmin = computed(() => {
    const user = this.currentUserSignal();
    const roleName = user?.Role?.Name || (user as any)?.Roles?.Name || '';
    return roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'superadmin';
  });

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const parsed = JSON.parse(userStr);
      return {
        ...parsed,
        Role: parsed.Role || parsed.Roles,
      };
    } catch {
      return null;
    }
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    const payload = {
      identifier: dto.identifier,
      Email: dto.identifier,
      Phone: dto.identifier,
      Password: dto.password || (dto as any).Password,
    };

    return this.http.post<any>(`${this.apiUrl}/auth/login`, payload).pipe(
      map((res) => {
        const data = res?.data || res;
        const user = data?.user || data;
        const token = data?.token;
        const refreshToken = data?.refreshToken;

        return {
          user: {
            ...user,
            Role: user.Role || user.Roles,
          },
          token,
          refreshToken,
        };
      }),
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    const payload = {
      Name: dto.name || (dto as any).Name,
      Email: dto.email || (dto as any).Email,
      Phone: dto.phone || (dto as any).Phone,
      Password: dto.password || (dto as any).Password,
    };

    return this.http.post<any>(`${this.apiUrl}/auth/register`, payload).pipe(
      map((res) => {
        const data = res?.data || res;
        const user = data?.user || data;
        const token = data?.token;
        const refreshToken = data?.refreshToken;

        return {
          user: {
            ...user,
            Role: user.Role || user.Roles,
          },
          token,
          refreshToken,
        };
      }),
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  sendOtp(dto: SendOtpDto): Observable<{ message: string; success: boolean }> {
    const payload = {
      Phone: dto.phone || (dto as any).Phone,
    };
    return this.http.post<any>(`${this.apiUrl}/auth/send-otp`, payload).pipe(
      map((res) => ({
        message: res?.message || 'OTP sent successfully',
        success: true,
      }))
    );
  }

  verifyOtp(dto: VerifyOtpDto): Observable<AuthResponse> {
    const payload = {
      Phone: dto.phone || (dto as any).Phone,
      otp: dto.otp,
    };

    return this.http.post<any>(`${this.apiUrl}/auth/verify-otp`, payload).pipe(
      map((res) => {
        const data = res?.data || res;
        const user = data?.user;
        const token = data?.token;
        const refreshToken = data?.refreshToken;

        return {
          user: user
            ? {
                ...user,
                Role: user.Role || user.Roles,
              }
            : null,
          token,
          refreshToken,
        };
      }),
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  refreshToken(refreshToken: string): Observable<{ token: string }> {
    return this.http.post<any>(`${this.apiUrl}/auth/refresh-token`, { refreshToken }).pipe(
      map((res) => res?.data || res),
      tap((res) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          this.tokenSignal.set(res.token);
        }
      })
    );
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<{ message: string }> {
    const payload = {
      identifier: dto.identifier,
      Email: dto.identifier,
      Phone: dto.identifier,
    };
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, payload);
  }

  resetPassword(dto: ResetPasswordDto): Observable<{ message: string }> {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, dto);
  }

  getMe(): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`).pipe(
      map((res) => {
        const user = res?.data || res;
        return {
          ...user,
          Role: user.Role || user.Roles,
        };
      }),
      tap((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSignal.set(user);
      })
    );
  }

  updateProfile(id: number, dto: UserUpdateDto): Observable<User> {
    const payload = {
      ...(dto.name ? { Name: dto.name } : {}),
      ...(dto.email ? { Email: dto.email } : {}),
      ...(dto.phone ? { Phone: dto.phone } : {}),
    };

    return this.http.put<any>(`${this.apiUrl}/user/update/${id}`, payload).pipe(
      map((res) => {
        const user = res?.data || res;
        return {
          ...user,
          Role: user.Role || user.Roles,
        };
      }),
      tap((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSignal.set(user);
      })
    );
  }

  changePassword(dto: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/user/change-password`, {
      OldPassword: dto.oldPassword,
      NewPassword: dto.newPassword,
    });
  }

  logout(): void {
    const token = this.tokenSignal();
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
        next: () => {},
        error: () => {},
      });
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSignal.set(null);
    this.tokenSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  private setSession(authRes: AuthResponse): void {
    if (authRes.token) {
      localStorage.setItem('token', authRes.token);
      this.tokenSignal.set(authRes.token);
    }
    if (authRes.user) {
      localStorage.setItem('user', JSON.stringify(authRes.user));
      this.currentUserSignal.set(authRes.user);
    }
  }

  // Admin user management
  getUsers(params?: UserQueryParams): Observable<{ data: User[]; total: number }> {
    return this.http.get<any>(`${this.apiUrl}/user/get`, {
      params: params as any,
    }).pipe(
      map((res) => {
        const raw = res?.data || res;
        return {
          data: raw?.items || (Array.isArray(raw) ? raw : []),
          total: raw?.pagination?.total || 0,
        };
      })
    );
  }

  toggleUserStatus(id: number): Observable<{ message: string; user: User }> {
    return this.http.put<any>(`${this.apiUrl}/user/toggle-status/${id}`, {});
  }
}
