import axios, { AxiosError, type AxiosResponse } from 'axios';

export interface ApiErrorResponse {
    error: string;
}

export const apiClient = axios.create({
    baseURL: 'http://localhost:3456/api/v1/admin',
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    (error: AxiosError<ApiErrorResponse>) => {
        const message = error.response?.data?.error || error.message;

        // Gracefully handle 401 Unauthorized without infinite reloads
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            window.dispatchEvent(new Event('auth_unauthorized')); // Trigger event instead of reload
        }

        console.error('API Error:', message);
        return Promise.reject(new Error(message));
    }
);