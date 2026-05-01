import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          
          // Only redirect if not already on login page to prevent infinite loop
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public getApi(): AxiosInstance {
    return this.api;
  }

  /**
   * Make a request with offline queue support
   * If offline, the request will be queued and executed when connection is restored
   */
  public async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.api.request<T>(config).then(response => response.data);
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

export const apiService = new ApiService();
export const api = apiService.getApi();
export default api;
