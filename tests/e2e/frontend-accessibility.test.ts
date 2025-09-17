import { test, expect } from '@playwright/test';

test.describe('Frontend Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
  });

  test.describe('Home Page Accessibility', () => {
    test('should load home page successfully', async ({ page }) => {
      await page.goto('/');
      
      // Check page title
      await expect(page).toHaveTitle(/Create Next App/);
      
      // Check main heading is present
      await expect(page.locator('h1')).toContainText('Multi-Tenant');
      await expect(page.locator('h1')).toContainText('Notes SaaS');
      
      // Check navigation is present
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('text=Notes SaaS')).toBeVisible();
      
      // Check navigation links
      await expect(page.locator('a[href="/login"]')).toBeVisible();
      await expect(page.locator('a[href="/signup"]')).toBeVisible();
    });

    test('should have proper navigation structure', async ({ page }) => {
      await page.goto('/');
      
      // Check navigation bar
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check logo/brand
      await expect(nav.locator('h1')).toContainText('Notes SaaS');
      
      // Check navigation links
      const signInLink = nav.locator('a[href="/login"]');
      const getStartedLink = nav.locator('a[href="/signup"]');
      
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toContainText('Sign In');
      
      await expect(getStartedLink).toBeVisible();
      await expect(getStartedLink).toContainText('Get Started');
    });

    test('should have accessible hero section', async ({ page }) => {
      await page.goto('/');
      
      // Check hero section content
      const heroSection = page.locator('text=Multi-Tenant Notes SaaS').locator('..');
      await expect(heroSection).toBeVisible();
      
      // Check main heading
      await expect(page.locator('h1')).toContainText('Multi-Tenant');
      await expect(page.locator('h1')).toContainText('Notes SaaS');
      
      // Check description
      await expect(page.locator('text=A secure, scalable notes application')).toBeVisible();
      
      // Check call-to-action buttons
      await expect(page.locator('text=Start Free Trial')).toBeVisible();
      await expect(page.locator('text=Sign In')).toBeVisible();
    });

    test('should have working navigation links', async ({ page }) => {
      await page.goto('/');
      
      // Test Sign In link
      await page.click('a[href="/login"]');
      await expect(page).toHaveURL('/login');
      
      // Go back to home
      await page.goto('/');
      
      // Test Get Started link
      await page.click('a[href="/signup"]');
      await expect(page).toHaveURL('/signup');
    });

    test('should redirect authenticated users to dashboard', async ({ page }) => {
      // Mock localStorage with token
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          role: 'member',
          tenantSlug: 'test-tenant'
        }));
      });
      
      await page.goto('/');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Login Page Accessibility', () => {
    test('should load login page successfully', async ({ page }) => {
      await page.goto('/login');
      
      // Check page loads
      await expect(page).toHaveURL('/login');
      
      // Check form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check form labels
      await expect(page.locator('label')).toContainText('Email');
      await expect(page.locator('label')).toContainText('Password');
    });

    test('should have proper form structure', async ({ page }) => {
      await page.goto('/login');
      
      // Check form is present
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Check required form fields
      const emailInput = form.locator('input[type="email"]');
      const passwordInput = form.locator('input[type="password"]');
      const submitButton = form.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Check form accessibility
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should show test accounts for easy testing', async ({ page }) => {
      await page.goto('/login');
      
      // Check test accounts section is present
      await expect(page.locator('text=Test Accounts')).toBeVisible();
      await expect(page.locator('text=password: password')).toBeVisible();
      
      // Check test account buttons are clickable
      const testAccountButtons = page.locator('button[type="button"]');
      await expect(testAccountButtons.first()).toBeVisible();
    });

    test('should have signup link', async ({ page }) => {
      await page.goto('/login');
      
      // Check signup link is present
      const signupLink = page.locator('a[href="/signup"]');
      await expect(signupLink).toBeVisible();
      await expect(signupLink).toContainText('Sign up');
    });
  });

  test.describe('Signup Page Accessibility', () => {
    test('should load signup page successfully', async ({ page }) => {
      await page.goto('/signup');
      
      // Check page loads
      await expect(page).toHaveURL('/signup');
      
      // Check form elements are present
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should have proper signup form structure', async ({ page }) => {
      await page.goto('/signup');
      
      // Check form is present
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Check required form fields
      const emailInput = form.locator('input[type="email"]');
      const passwordInput = form.locator('input[type="password"]');
      const submitButton = form.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Check form accessibility
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should have login link', async ({ page }) => {
      await page.goto('/signup');
      
      // Check login link is present
      const loginLink = page.locator('a[href="/login"]');
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toContainText('Sign in');
    });
  });

  test.describe('Dashboard Page Accessibility', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should load dashboard for authenticated users', async ({ page }) => {
      // Mock localStorage with token
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          role: 'member',
          tenantSlug: 'test-tenant'
        }));
      });
      
      await page.goto('/dashboard');
      
      // Check dashboard loads
      await expect(page).toHaveURL('/dashboard');
      
      // Check main dashboard elements
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    });

    test('should have proper dashboard navigation tabs', async ({ page }) => {
      // Mock localStorage with token
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          role: 'member',
          tenantSlug: 'test-tenant'
        }));
      });
      
      await page.goto('/dashboard');
      
      // Check tab navigation
      await expect(page.locator('button:has-text("Notes")')).toBeVisible();
      await expect(page.locator('button:has-text("Users")')).toBeVisible();
      await expect(page.locator('button:has-text("Subscription")')).toBeVisible();
    });

    test('should show user information', async ({ page }) => {
      // Mock localStorage with token
      await page.addInitScript(() => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('user', JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          role: 'member',
          tenantSlug: 'test-tenant'
        }));
      });
      
      await page.goto('/dashboard');
      
      // Check user info is displayed
      await expect(page.locator('text=test@example.com')).toBeVisible();
      await expect(page.locator('text=member')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      
      // Check navigation is still accessible
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      
      // Check main content is visible
      await expect(page.locator('text=Multi-Tenant Notes SaaS')).toBeVisible();
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/');
      
      // Check navigation and content
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('text=Multi-Tenant Notes SaaS')).toBeVisible();
    });

    test('should be responsive on desktop devices', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('/');
      
      // Check navigation and content
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('text=Multi-Tenant Notes SaaS')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should validate login form fields', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check validation messages
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should validate signup form fields', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check validation messages
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      const response = await page.goto('/nonexistent-page');
      expect(response?.status()).toBe(404);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      await page.goto('/');
      
      // Page should still load (cached or fallback)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have proper page titles', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Create Next App/);
      
      await page.goto('/login');
      await expect(page).toHaveTitle(/Create Next App/);
      
      await page.goto('/signup');
      await expect(page).toHaveTitle(/Create Next App/);
    });
  });

  test.describe('Accessibility Standards', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check h1 is present
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Check no duplicate h1s
      const h1Count = await h1.count();
      expect(h1Count).toBe(1);
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      
      // Check form inputs have labels
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // Check labels are associated with inputs
      const emailLabel = page.locator('label').filter({ hasText: 'Email' });
      const passwordLabel = page.locator('label').filter({ hasText: 'Password' });
      
      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
    });

    test('should have proper button text', async ({ page }) => {
      await page.goto('/');
      
      // Check buttons have descriptive text
      await expect(page.locator('button:has-text("Start Free Trial")')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    test('should have proper link text', async ({ page }) => {
      await page.goto('/');
      
      // Check links have descriptive text
      await expect(page.locator('a:has-text("Sign In")')).toBeVisible();
      await expect(page.locator('a:has-text("Get Started")')).toBeVisible();
    });
  });
});
