import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiRequest, clearTokens, getTokens, setTokens } from '../utils/api';

export interface UserProfile {
    phone_number: string;
    bio: string;
    department: string;
    address: string;
    avatar_url: string;
}

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: 'Admin' | 'Manager' | 'Support Agent' | 'Sales Agent' | 'Customer';
    profile: UserProfile;
    created_at: string;
    updated_at: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<User>;
    register: (data: Record<string, string>) => Promise<any>;
    logout: () => Promise<void>;
    updateProfile: (profileData: Partial<UserProfile>, firstName?: string, lastName?: string) => Promise<User>;
    setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const { accessToken } = getTokens();
            if (accessToken) {
                try {
                    const userData = await apiRequest('/auth/profile/');
                    setUser(userData);
                } catch (err: any) {
                    console.error('Failed to load user profile on mount:', err);
                    clearTokens();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        loadUser();
    }, []);

    const login = async (email: string, password: string): Promise<User> => {
        setIsLoading(true);
        setError(null);
        try {
            const tokenData = await apiRequest('/auth/login/', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            
            setTokens(tokenData.access, tokenData.refresh);
            
            // Fetch complete user profile data
            const userData = await apiRequest('/auth/profile/');
            setUser(userData);
            setIsLoading(false);
            return userData;
        } catch (err: any) {
            setIsLoading(false);
            const errMsg = err.data?.detail || err.data?.non_field_errors?.[0] || 'Login failed. Please verify credentials.';
            setError(errMsg);
            throw err;
        }
    };

    const register = async (data: Record<string, string>): Promise<any> => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiRequest('/auth/register/', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            setIsLoading(false);
            return res;
        } catch (err: any) {
            setIsLoading(false);
            // Format serializer errors into readable format or return object
            throw err;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        const { refreshToken } = getTokens();
        if (refreshToken) {
            try {
                await apiRequest('/auth/logout/', {
                    method: 'POST',
                    body: JSON.stringify({ refresh: refreshToken }),
                });
            } catch (err) {
                console.error('Logout API blacklist error:', err);
            }
        }
        clearTokens();
        setUser(null);
        setIsLoading(false);
    };

    const updateProfile = async (profileData: Partial<UserProfile>, firstName?: string, lastName?: string): Promise<User> => {
        setIsLoading(true);
        setError(null);
        try {
            const updatedProfile = await apiRequest('/auth/profile/', {
                method: 'PUT',
                body: JSON.stringify({
                    ...profileData,
                    first_name: firstName,
                    last_name: lastName
                }),
            });
            setUser(updatedProfile);
            setIsLoading(false);
            return updatedProfile;
        } catch (err: any) {
            setIsLoading(false);
            throw err;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                error,
                login,
                register,
                logout,
                updateProfile,
                setError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
