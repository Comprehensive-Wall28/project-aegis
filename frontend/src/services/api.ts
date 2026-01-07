import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    // Axios looks for this cookie and sets this header automatically
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Attach CSRF token to request header (to bypass Axios issues or if cookie is httpOnly=false)
apiClient.interceptors.request.use((config) => {
    // Manually parse XSRF-TOKEN from document.cookie
    const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
    if (match) {
        config.headers['X-XSRF-TOKEN'] = match[2];
    }
    return config;
});

// Response interceptor to handle 403 CSRF errors or other global error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 403 && error.response.data.code === 'EBADCSRFTOKEN') {
            console.error('CSRF Token Mismatch');
            // specific logic if needed (e.g. force refresh)
        }
        return Promise.reject(error);
    }
);

export default apiClient;
