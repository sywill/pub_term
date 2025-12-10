import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { sessionsApi } from '../services/api';
import './DashboardPage.css';

interface Session {
    id: string;
    name: string;
    description?: string;
    status: string;
    createdAt: string;
    owner: { id: string; name: string };
    _count: { members: number };
}

export function DashboardPage() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionDesc, setNewSessionDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (token) {
            loadSessions();
        }
    }, [token]);

    const loadSessions = async () => {
        try {
            const data = await sessionsApi.list(token!);
            setSessions(data);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) return;

        setIsCreating(true);
        try {
            const session = await sessionsApi.create(token!, newSessionName, newSessionDesc);
            navigate(`/session/${session.id}`);
        } catch (error) {
            console.error('Failed to create session:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'badge-success';
            case 'PAUSED': return 'badge-warning';
            case 'TERMINATED': return 'badge-error';
            default: return '';
        }
    };

    return (
        <div className="dashboard-page">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-icon">⌘</span>
                        <span className="logo-text">PubTerm</span>
                    </div>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role badge">{user?.role}</span>
                    </div>
                    <button className="btn btn-secondary" onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="dashboard-main">
                <div className="dashboard-title-row">
                    <h1>Your Sessions</h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span>+</span> New Session
                    </button>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-spinner large" />
                        <p>Loading sessions...</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="empty-state card">
                        <div className="empty-icon">🖥️</div>
                        <h3>No sessions yet</h3>
                        <p className="text-secondary">
                            Create your first session to start using Claude in the terminal.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Session
                        </button>
                    </div>
                ) : (
                    <div className="sessions-grid">
                        {sessions.map((session) => (
                            <Link
                                key={session.id}
                                to={`/session/${session.id}`}
                                className="session-card card"
                            >
                                <div className="session-header">
                                    <h3>{session.name}</h3>
                                    <span className={`badge ${getStatusColor(session.status)}`}>
                                        {session.status}
                                    </span>
                                </div>
                                {session.description && (
                                    <p className="session-description text-secondary">
                                        {session.description}
                                    </p>
                                )}
                                <div className="session-meta">
                                    <span className="meta-item">
                                        👤 {session.owner.name}
                                    </span>
                                    <span className="meta-item">
                                        👥 {session._count.members} member{session._count.members !== 1 ? 's' : ''}
                                    </span>
                                    <span className="meta-item">
                                        🕐 {new Date(session.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Session</h2>
                        <form onSubmit={handleCreateSession}>
                            <div className="form-group">
                                <label htmlFor="session-name">Session Name</label>
                                <input
                                    id="session-name"
                                    type="text"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    placeholder="e.g., Code Review"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="session-desc">Description (optional)</label>
                                <textarea
                                    id="session-desc"
                                    value={newSessionDesc}
                                    onChange={(e) => setNewSessionDesc(e.target.value)}
                                    placeholder="What is this session for?"
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isCreating || !newSessionName.trim()}
                                >
                                    {isCreating ? <span className="loading-spinner" /> : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
