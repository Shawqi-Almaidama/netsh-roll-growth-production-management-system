import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleCode } from '../types.js';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api.js';

interface DemoAccount {
  username: string;
  roleCode: RoleCode;
  roleNameAr: string;
  fullName: string;
  avatarText: string;
  color: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', roleCode: 'ADMIN', roleNameAr: 'مدير النظام', fullName: 'شوقي الميدمة', avatarText: 'شم', color: 'rose' },
  { username: 'ahmed_saber', roleCode: 'PROD_MANAGER', roleNameAr: 'مدير قسم الإنتاج', fullName: 'أحمد صبر', avatarText: 'أص', color: 'blue' },
  { username: 'mohammed_a', roleCode: 'SALES_OFFICER', roleNameAr: 'مسؤول المبيعات والفواتير', fullName: 'محمد الأعوج', avatarText: 'مع', color: 'amber' },
  { username: 'rayan_m', roleCode: 'WAREHOUSE_KEEPER', roleNameAr: 'أمين المخازن', fullName: 'ريان موسى', avatarText: 'رم', color: 'purple' },
  { username: 'maher_n', roleCode: 'ACCOUNTANT', roleNameAr: 'المحاسب المالي', fullName: 'ماهر نضير', avatarText: 'من', color: 'indigo' },
  { username: 'supervisor1', roleCode: 'SUPERVISOR', roleNameAr: 'مشرف الإنتاج', fullName: 'مشرف الإنتاج', avatarText: 'مش', color: 'emerald' }
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  quickSwitchUser: (username: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: (RoleCode | string)[]) => boolean;
  hasPermission: (perm: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (!getAuthToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login({ username, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickSwitchUser = async (_username: string) => {
    logout();
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles: (RoleCode | string)[]): boolean => {
    if (!user) return false;
    if (user.roleCode === 'ADMIN') return true; // ADMIN inherits all privileges
    if (roles.includes(user.roleCode)) return true;
    if ((user.roleCode === 'PROD_MANAGER' || user.roleCode === 'PROD_MGR') &&
        (roles.includes('PROD_MGR') || roles.includes('PROD_MANAGER'))) {
      return true;
    }
    return false;
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.roleCode === 'ADMIN') return true;
    return user.permissions?.includes(perm) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickSwitchUser,
        logout,
        hasRole,
        hasPermission,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
