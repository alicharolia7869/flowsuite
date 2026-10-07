export interface ApiError {
  code: string;
  message: string;
  status: number;
}

class ApiClient {
  private baseUrl = '/api/v1';

  private getAccessToken(): string | null {
    return localStorage.getItem('flowsuite_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('flowsuite_refresh_token');
  }

  private getActiveOrgId(): string | null {
    const val = localStorage.getItem('flowsuite_active_org_id');
    if (!val || val === 'undefined' || val === 'null' || val.trim() === '') {
      return null;
    }
    return val;
  }

  private setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('flowsuite_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('flowsuite_refresh_token', refreshToken);
    }
  }

  private clearTokens() {
    localStorage.removeItem('flowsuite_access_token');
    localStorage.removeItem('flowsuite_refresh_token');
    localStorage.removeItem('flowsuite_active_org_id');
  }

  private refreshPromise: Promise<string | null> | null = null;

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
          return data.tokens.accessToken as string;
        } else {
          this.clearTokens();
          return null;
        }
      } catch {
        this.clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const activeOrgId = this.getActiveOrgId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    let res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle token expiration and automatic refresh
    if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const newAccessToken = await this.refreshAccessToken();
      if (newAccessToken) {
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        res = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        this.clearTokens();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error: ApiError = data?.error || {
        code: 'API_ERROR',
        message: data?.message || 'An unexpected error occurred while communicating with the server.',
        status: res.status,
      };
      throw error;
    }

    return data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
