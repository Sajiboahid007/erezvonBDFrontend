import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../../shared.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  loginForm!: FormGroup;
  otpForm!: FormGroup;
  forgotForm!: FormGroup;

  isOtpMode = signal<boolean>(false);
  otpSent = signal<boolean>(false);
  loading = signal<boolean>(false);
  forgotDialogVisible = signal<boolean>(false);
  returnUrl = signal<string>('/');

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required],
    });

    this.otpForm = this.fb.group({
      phone: ['', Validators.required],
      otp: [''],
    });

    this.forgotForm = this.fb.group({
      identifier: ['', Validators.required],
    });

    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        this.returnUrl.set(params['returnUrl']);
      }
      if (params['error'] === 'unauthorized_admin') {
        this.messageService.add({
          severity: 'error',
          summary: 'Access Denied',
          detail: 'Admin privileges required to access that portal.',
        });
      }
    });
  }

  submitPasswordLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Welcome Back',
          detail: `Signed in as ${res.user?.Name || 'User'}`,
        });
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigateByUrl(this.returnUrl());
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: err?.error?.message || 'Invalid email/phone or password.',
        });
      },
    });
  }

  sendOtp(): void {
    const phone = this.otpForm.get('phone')?.value;
    if (!phone) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Phone required',
        detail: 'Please enter your phone number to receive OTP.',
      });
      return;
    }

    this.loading.set(true);
    this.authService.sendOtp({ phone }).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpSent.set(true);
        this.messageService.add({
          severity: 'info',
          summary: 'OTP Sent',
          detail: 'A verification code was sent to your phone (demo: 123456).',
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: err?.error?.message || 'Failed to send OTP.',
        });
      },
    });
  }

  verifyOtp(): void {
    const { phone, otp } = this.otpForm.value;
    if (!otp) return;

    this.loading.set(true);
    this.authService.verifyOtp({ phone, otp }).subscribe({
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Verified',
          detail: 'OTP successfully verified.',
        });
        this.router.navigateByUrl(this.returnUrl());
      },
      error: (err) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid OTP',
          detail: err?.error?.message || 'Verification failed.',
        });
      },
    });
  }

  sendForgotPassword(): void {
    if (this.forgotForm.invalid) return;
    this.authService.forgotPassword(this.forgotForm.value).subscribe({
      next: () => {
        this.forgotDialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Password Reset',
          detail: 'Instructions sent if account exists.',
        });
      },
    });
  }
}
