import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  role: Role;
  plan?: string;
  joinedAt?: string;
}

interface AuthContextType {
  user: User | null;
  currentOrg: UserOrganization | null;
  organizations: UserOrganization[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; organizationName: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  hasRole: (roles: Role[]) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('flowsuite_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.get<{ user: User; organizations: UserOrganization[] }>('/auth/me');
      setUser(res.user);
      setOrganizations(res.organizations);

      const savedOrgId = localStorage.getItem('flowsuite_active_org_id');
      const active = res.organizations.find(o => o.id === savedOrgId) || res.organizations[0] || null;

      setCurrentOrg(active);
      if (active) {
        localStorage.setItem('flowsuite_active_org_id', active.id);
      }
    } catch (err) {
      console.warn('Failed to load user session:', err);
      setUser(null);
      setCurrentOrg(null);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    localStorage.setItem('flowsuite_access_token', res.tokens.accessToken);
    localStorage.setItem('flowsuite_refresh_token', res.tokens.refreshToken);
    if (res.organization) {
      localStorage.setItem('flowsuite_active_org_id', res.organization.id);
    }
    await fetchProfile();
  };

  const register = async (data: { name: string; email: string; password: string; organizationName: string }) => {
    const res = await api.post<any>('/auth/register', data);
    localStorage.setItem('flowsuite_access_token', res.tokens.accessToken);
    localStorage.setItem('flowsuite_refresh_token', res.tokens.refreshToken);
    if (res.organization) {
      localStorage.setItem('flowsuite_active_org_id', res.organization.id);
    }
    await fetchProfile();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('flowsuite_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('flowsuite_access_token');
      localStorage.removeItem('flowsuite_refresh_token');
      localStorage.removeItem('flowsuite_active_org_id');
      setUser(null);
      setCurrentOrg(null);
      setOrganizations([]);
    }
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find(o => o.id === orgId);
    if (target) {
      localStorage.setItem('flowsuite_active_org_id', target.id);
      setCurrentOrg(target);
      // Trigger a light reload or page re-query
      window.location.reload();
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!currentOrg) return false;
    return allowedRoles.includes(currentOrg.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        hasRole,
        refreshUserData: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
