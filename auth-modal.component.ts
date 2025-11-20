
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop with blur -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" (click)="close()"></div>

      <!-- Modal Card -->
      <div class="relative w-full max-w-md bg-[#0f111a]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Mesh Gradient Background Effect -->
        <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none"></div>
        
        <!-- Close Button -->
        <button (click)="close()" class="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="p-8 relative z-0">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <h2 class="text-2xl font-bold text-white mb-1">{{ isLogin() ? 'Welcome Back' : 'Create Account' }}</h2>
            <p class="text-white/40 text-sm">{{ isLogin() ? 'Enter your credentials to access your projects.' : 'Join Nebula AI to start building the future.' }}</p>
          </div>

          <!-- Form -->
          <form (submit)="onSubmit($event)" class="space-y-4">
            
            @if (!isLogin()) {
              <div class="space-y-1">
                <label class="text-xs font-medium text-white/60 ml-1">Full Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="name" 
                  name="name"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  placeholder="John Doe"
                >
              </div>
            }

            <div class="space-y-1">
              <label class="text-xs font-medium text-white/60 ml-1">Email Address</label>
              <input 
                type="email" 
                [(ngModel)]="email" 
                name="email"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                placeholder="name@example.com"
              >
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-white/60 ml-1">Password</label>
              <input 
                type="password" 
                [(ngModel)]="password" 
                name="password"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                placeholder="••••••••"
              >
            </div>

            @if (error()) {
              <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs text-center">
                {{ error() }}
              </div>
            }

            <button 
              type="submit"
              [disabled]="isLoading()"
              class="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (isLoading()) {
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              }
              {{ isLogin() ? 'Sign In' : 'Create Account' }}
            </button>
          </form>

          <!-- Toggle -->
          <div class="mt-6 text-center">
            <p class="text-sm text-white/40">
              {{ isLogin() ? "Don't have an account?" : "Already have an account?" }}
              <button (click)="toggleMode()" class="text-purple-400 hover:text-purple-300 font-medium ml-1 hover:underline transition-all">
                {{ isLogin() ? 'Sign Up' : 'Sign In' }}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuthModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  private authService = inject(AuthService);

  isLogin = signal(true);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Form Data
  name = '';
  email = '';
  password = '';

  toggleMode() {
    this.isLogin.update(v => !v);
    this.error.set(null);
  }

  close() {
    this.closeModal.emit();
  }

  async onSubmit(e: Event) {
    e.preventDefault();
    this.isLoading.set(true);
    this.error.set(null);

    try {
      if (this.isLogin()) {
        await this.authService.login(this.email, this.password);
      } else {
        await this.authService.register(this.name, this.email, this.password);
      }
      this.close();
    } catch (err: any) {
      this.error.set(err as string);
    } finally {
      this.isLoading.set(false);
    }
  }
}
