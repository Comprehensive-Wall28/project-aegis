import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    // Enable automatic CSRF token handling
    // Axios will automatically read XSRF-TOKEN cookie and send it in X-XSRF-TOKEN header
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
});

export default apiClient;
