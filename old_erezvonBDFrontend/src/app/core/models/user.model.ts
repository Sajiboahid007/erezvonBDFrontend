export interface User {
  Id: number;
  Name: string;
  Email: string;
  Phone: string;
  RoleId: number;
  Role?: Role;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
  Addresses?: Address[];
}

export interface Role {
  Id: number;
  Name: 'Admin' | 'SuperAdmin' | 'Customer' | string;
  Description?: string;
}

export interface Address {
  Id?: number;
  UserId?: number | null;
  Name: string;
  Phone: string;
  Email?: string | null;
  Street: string;
  Thana: string;
  District: string;
  City: string;
  PostalCode?: string | null;
  IsDefault?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface LoginDto {
  identifier: string; // Phone or Email
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface ForgotPasswordDto {
  identifier: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface UserUpdateDto {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  roleId?: number;
  search?: string;
  isActive?: boolean;
}
