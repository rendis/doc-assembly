import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { useAppContextStore } from '@/stores/app-context-store';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  const tenant = useAppContextStore.getState().currentTenant;
  const workspace = useAppContextStore.getState().currentWorkspace;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenant?.id) {
    config.headers['X-Tenant-ID'] = tenant.id;
  }

  if (workspace?.id) {
    config.headers['X-Workspace-ID'] = workspace.id;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Para respuestas blob, retornar la respuesta completa
    // para preservar metadata (headers, config, etc.)
    if (response.config.responseType === 'blob') {
      return response;
    }

    // Para respuestas JSON/text normales, retornar solo data
    return response.data;
  },
  (error) => {
    // Handle 401s globally (e.g., redirect to login)
    if (error.response?.status === 401) {
      useAuthStore.getState().setToken(null);
      // Ideally redirect to login here or via an event
    }
    return Promise.reject(error);
  }
);
