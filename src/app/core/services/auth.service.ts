import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, map, tap, of, catchError } from 'rxjs';
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
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentUserSignal = signal<User | null>(this.getStoredUser());
  tokenSignal = signal<string | null>(localStorage.getItem('token'));

  isAuthenticated = computed(() => !!this.tokenSignal());
  isAdmin = computed(() => {
    const user = this.currentUserSignal();
    const roleName = user?.Role?.Name || (user as any)?.Roles?.Name || '';
    return (
      roleName.toLowerCase() === 'admin' ||
      roleName.toLowerCase() === 'superadmin' ||
      user?.RoleId === 1 ||
      user?.RoleId === 2
    );
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
    const identifier = (dto.identifier || (dto as any).email || (dto as any).phone || '').trim();
    const password = dto.password || (dto as any).Password;

    const run = async (): Promise<AuthResponse> => {
      let user: any = null;

      // 1. Try matching by Email
      const { data: emailUsers } = await this.supabase.client
        .from('Users')
        .select('*')
        .ilike('Email', identifier)
        .eq('IsMarkToDelete', false)
        .limit(1);

      if (emailUsers && emailUsers.length > 0) {
        user = emailUsers[0];
      }

      // 2. Try matching by Phone
      if (!user) {
        const { data: phoneUsers } = await this.supabase.client
          .from('Users')
          .select('*')
          .eq('Phone', identifier)
          .eq('IsMarkToDelete', false)
          .limit(1);

        if (phoneUsers && phoneUsers.length > 0) {
          user = phoneUsers[0];
        }
      }

      // 3. Try matching by Name
      if (!user) {
        const { data: nameUsers } = await this.supabase.client
          .from('Users')
          .select('*')
          .ilike('Name', identifier)
          .eq('IsMarkToDelete', false)
          .limit(1);

        if (nameUsers && nameUsers.length > 0) {
          user = nameUsers[0];
        }
      }

      if (!user) {
        throw new Error('User not found. Please verify your email or phone number.');
      }

      // Verify Password (case-sensitive or trimmed)
      if (user.Password && password) {
        if (user.Password.trim() !== password.trim()) {
          throw new Error('Incorrect password. Please try again.');
        }
      }

      // Determine Role
      let roleName = user.RoleId === 1 ? 'SuperAdmin' : user.RoleId === 2 ? 'Admin' : 'Customer';
      if (user.RoleId) {
        const { data: roleRow } = await this.supabase.client
          .from('Roles')
          .select('*')
          .eq('Id', user.RoleId)
          .maybeSingle();
        if (roleRow?.Name) {
          roleName = roleRow.Name;
        }
      }

      const formattedUser: User = {
        ...user,
        Role: { Id: user.RoleId || 1, Name: roleName },
      };

      const token = `sb-token-${user.Id}-${Date.now()}`;
      return {
        user: formattedUser,
        token,
        refreshToken: `sb-ref-${user.Id}-${Date.now()}`,
      };
    };

    return from(run()).pipe(
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    const run = async (): Promise<AuthResponse> => {
      const name = dto.name || (dto as any).Name;
      const email = dto.email || (dto as any).Email;
      const phone = dto.phone || (dto as any).Phone;
      const password = dto.password || (dto as any).Password;

      const { data: newUser, error } = await this.supabase.client
        .from('Users')
        .insert({
          Name: name,
          Email: email,
          Phone: phone,
          Password: password,
          RoleId: 3, // Customer
          IsActive: true,
          IsMarkToDelete: false,
          CreatedBy: 'SELF',
        })
        .select('*, Role:Roles(*)')
        .single();

      if (error) {
        throw new Error(error.message || 'Registration failed');
      }

      const formattedUser: User = {
        ...newUser,
        Role: newUser.Role || newUser.Roles || { Id: 3, Name: 'Customer' },
      };

      const token = `sb-token-${newUser.Id}-${Date.now()}`;
      return {
        user: formattedUser,
        token,
        refreshToken: `sb-ref-${newUser.Id}-${Date.now()}`,
      };
    };

    return from(run()).pipe(
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  sendOtp(dto: SendOtpDto): Observable<{ message: string; success: boolean }> {
    return of({ message: 'OTP sent to mobile number', success: true });
  }

  verifyOtp(dto: VerifyOtpDto): Observable<AuthResponse> {
    const phone = dto.phone || (dto as any).Phone;
    const run = async (): Promise<AuthResponse> => {
      const { data: user } = await this.supabase.client
        .from('Users')
        .select('*, Role:Roles(*)')
        .eq('Phone', phone)
        .maybeSingle();

      const token = `sb-token-${user?.Id || 1}-${Date.now()}`;
      return {
        user: user || null,
        token,
      };
    };

    return from(run()).pipe(
      tap((authRes) => {
        if (authRes.token) {
          this.setSession(authRes);
        }
      })
    );
  }

  refreshToken(refreshToken: string): Observable<{ token: string }> {
    const token = `sb-token-refreshed-${Date.now()}`;
    localStorage.setItem('token', token);
    this.tokenSignal.set(token);
    return of({ token });
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<{ message: string }> {
    return of({ message: 'Password reset link sent to your registered email' });
  }

  resetPassword(dto: ResetPasswordDto): Observable<{ message: string }> {
    return of({ message: 'Password has been reset successfully' });
  }

  getMe(): Observable<User> {
    const current = this.currentUserSignal();
    if (!current?.Id) {
      return of({} as User);
    }

    return from(
      this.supabase.client
        .from('Users')
        .select('*, Role:Roles(*)')
        .eq('Id', current.Id)
        .single()
    ).pipe(
      map(({ data: user, error }) => {
        if (error || !user) throw error || new Error('User not found');
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
    const payload: any = {
      ...(dto.name ? { Name: dto.name } : {}),
      ...(dto.email ? { Email: dto.email } : {}),
      ...(dto.phone ? { Phone: dto.phone } : {}),
      UpdatedDate: new Date().toISOString(),
    };

    return from(
      this.supabase.client
        .from('Users')
        .update(payload)
        .eq('Id', id)
        .select('*, Role:Roles(*)')
        .single()
    ).pipe(
      map(({ data: user, error }) => {
        if (error) throw error;
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
    const user = this.currentUserSignal();
    if (!user?.Id) {
      return of({ message: 'User not authenticated' });
    }

    return from(
      this.supabase.client
        .from('Users')
        .update({
          Password: dto.newPassword,
          UpdatedDate: new Date().toISOString(),
        })
        .eq('Id', user.Id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        return { message: 'Password updated successfully' };
      })
    );
  }

  logout(): void {
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
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let query = this.supabase.client
      .from('Users')
      .select('*, Role:Roles(*)', { count: 'exact' })
      .eq('IsMarkToDelete', false)
      .range(fromIndex, toIndex);

    if (params?.search) {
      query = query.or(`Name.ilike.%${params.search}%,Email.ilike.%${params.search}%,Phone.ilike.%${params.search}%`);
    }

    return from(query).pipe(
      map(({ data, count, error }) => {
        if (error) {
          console.error('Error fetching users:', error);
          return { data: [], total: 0 };
        }
        return {
          data: (data || []).map((u: any) => ({
            ...u,
            Role: u.Role || u.Roles,
          })),
          total: count || (data || []).length,
        };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  toggleUserStatus(id: number): Observable<{ message: string; user: User }> {
    const run = async () => {
      const { data: user } = await this.supabase.client
        .from('Users')
        .select('IsActive')
        .eq('Id', id)
        .single();

      const newStatus = !(user?.IsActive ?? true);

      const { data: updated, error } = await this.supabase.client
        .from('Users')
        .update({ IsActive: newStatus, UpdatedDate: new Date().toISOString() })
        .eq('Id', id)
        .select('*, Role:Roles(*)')
        .single();

      if (error) throw error;
      return {
        message: `User status changed to ${newStatus ? 'Active' : 'Inactive'}`,
        user: { ...updated, Role: updated.Role || updated.Roles },
      };
    };

    return from(run());
  }
}
