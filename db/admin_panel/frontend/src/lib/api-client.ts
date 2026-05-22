import axios, { AxiosError, type AxiosResponse } from 'axios';

export interface ApiErrorResponse {
    error: string;
}

export const apiClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response.data,
    (error: AxiosError<ApiErrorResponse>) => {
        const message = error.response?.data?.error || error.message;
        console.error('API Error:', message);
        return Promise.reject(new Error(message));
    }
);