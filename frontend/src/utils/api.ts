const API_BASE_URL = 'http://localhost:8000/api';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const getTokens = () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    return { accessToken, refreshToken };
};

export const setTokens = (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
    const { refreshToken } = getTokens();
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            throw new Error('Refresh token expired');
        }

        const data = await response.json();
        setTokens(data.access, data.refresh || refreshToken);
        return data.access;
    } catch (error) {
        clearTokens();
        // Redirect to login if token refresh fails and we are on a protected page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
            window.location.href = '/login?expired=true';
        }
        return null;
    }
};

export const apiRequest = async (endpoint: string, options: RequestOptions = {}): Promise<any> => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // Set headers
    const headers = options.headers || {};
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const { accessToken } = getTokens();
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    options.headers = headers;

    try {
        let response = await fetch(url, options);

        // If unauthorized, attempt token refresh once
        if (response.status === 401 && !url.includes('/auth/login/') && !url.includes('/auth/token/refresh/')) {
            if (!isRefreshing) {
                isRefreshing = true;
                const newAccessToken = await refreshAccessToken();
                isRefreshing = false;
                
                if (newAccessToken) {
                    onRefreshed(newAccessToken);
                }
            }

            if (isRefreshing) {
                // Wait for the token to be refreshed
                return new Promise((resolve) => {
                    subscribeTokenRefresh(async (token) => {
                        headers['Authorization'] = `Bearer ${token}`;
                        options.headers = headers;
                        const retryResponse = await fetch(url, options);
                        resolve(handleResponse(retryResponse));
                    });
                });
            } else {
                const { accessToken: retriedAccessToken } = getTokens();
                if (retriedAccessToken) {
                    headers['Authorization'] = `Bearer ${retriedAccessToken}`;
                    options.headers = headers;
                    response = await fetch(url, options);
                }
            }
        }

        return await handleResponse(response);
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        // If it's a 204 No Content with error state (unlikely) or normal bad requests
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { detail: 'An error occurred' };
        }
        throw { status: response.status, data: errorData };
    }

    if (response.status === 204) {
        return null;
    }

    return await response.json();
};
