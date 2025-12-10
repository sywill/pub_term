import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '';

// Auth API
export const authApi = {
    async register(email: string, password: string, name: string) {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Registration failed');
        }
        return res.json();
    },

    async login(email: string, password: string) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }
        return res.json();
    },

    async me(token: string) {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
    },
};

// Sessions API
export const sessionsApi = {
    async list(token: string) {
        const res = await fetch(`${API_URL}/api/sessions`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch sessions');
        return res.json();
    },

    async create(token: string, name: string, description?: string) {
        const res = await fetch(`${API_URL}/api/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name, description }),
        });
        if (!res.ok) throw new Error('Failed to create session');
        return res.json();
    },

    async get(token: string, sessionId: string) {
        const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
    },

    async createInvite(token: string, sessionId: string, role: 'VIEWER' | 'OPERATOR') {
        const res = await fetch(`${API_URL}/api/sessions/${sessionId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
        });
        if (!res.ok) throw new Error('Failed to create invite');
        return res.json();
    },

    async joinWithInvite(token: string, inviteToken: string) {
        const res = await fetch(`${API_URL}/api/sessions/join/${inviteToken}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to join session');
        return res.json();
    },

    async delete(token: string, sessionId: string) {
        const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete session');
    },
};

// WebSocket connection
export function createSocket(token: string): Socket {
    return io(API_URL || window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
    });
}
