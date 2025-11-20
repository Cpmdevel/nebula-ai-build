
import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() {
    // Check local storage for persisting session in a real app
    // For demo, we start logged out
  }

  async login(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          const user: User = {
            id: '123',
            name: email.split('@')[0], // Generate name from email for demo
            email: email,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${email}`
          };
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          resolve();
        } else {
          reject('Invalid credentials');
        }
      }, 1500); // Simulate network delay
    });
  }

  async register(name: string, email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password && name) {
          const user: User = {
            id: '456',
            name: name,
            email: email,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}`
          };
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          resolve();
        } else {
          reject('Please fill all fields');
        }
      }, 1500);
    });
  }

  logout() {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }
}
