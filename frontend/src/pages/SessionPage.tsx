import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { sessionsApi, createSocket } from '../services/api';
import { Terminal } from '../components/Terminal';
import './SessionPage.css';

interface SessionData {
    id: string;
    name: string;
    description?: string;
    status: string;
    owner: { id: string; name: string; email: string };
    members: Array<{ id: string; role: string; user: { id: string; name: string } }>;
}

export function SessionPage() {
    const { id } = useParams<{ id: string }>();
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [session, setSession] = useState<SessionData | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [inviteRole, setInviteRole] = useState<'VIEWER' | 'OPERATOR'>('VIEWER');

    useEffect(() => {
        if (!id || !token) return;

        // Load session details
        sessionsApi.get(token, id)
            .then((data) => {
                setSession(data.session);
                setUserRole(data.userRole);
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => setIsLoading(false));

        // Create WebSocket connection
        const ws = createSocket(token);
        setSocket(ws);

        return () => {
            ws.disconnect();
        };
    }, [id, token]);

    const handleCreateInvite = async () => {
        if (!id || !token) return;

        try {
            const data = await sessionsApi.createInvite(token, id, inviteRole);
            const link = `${window.location.origin}/join/${data.token}`;
            setInviteLink(link);
        } catch (err) {
            console.error('Failed to create invite:', err);
        }
    };

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(inviteLink);
    };

    const handleDeleteSession = async () => {
        if (!id || !token) return;
        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            await sessionsApi.delete(token, id);
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const canWrite = userRole === 'OWNER' || userRole === 'OPERATOR';
    const isOwner = userRole === 'OWNER';

    if (isLoading) {
        return (
            <div className="session-page loading">
                <div className="loading-spinner large" />
                <p>Loading session...</p>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="session-page error">
                <h2>Session Not Found</h2>
                <p className="text-secondary">{error || 'Unable to load session'}</p>
                <Link to="/dashboard" className="btn btn-primary">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="session-page">
            {/* Header */}
            <header className="session-header">
                <div className="header-left">
                    <Link to="/dashboard" className="back-link">
                        ← Back
                    </Link>
                    <div className="session-info">
                        <h1>{session.name}</h1>
                        <div className="session-meta">
                            <span className={`badge badge-${session.status.toLowerCase()}`}>
                                {session.status}
                            </span>
                            <span className="role-badge">
                                You: {userRole}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="header-right">
                    {isOwner && (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowInviteModal(true)}
                            >
                                Invite
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteSession}
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Terminal */}
            <main className="terminal-container">
                <Terminal
                    socket={socket}
                    sessionId={id!}
                    canWrite={canWrite}
                />
            </main>

            {/* Members sidebar (mobile-hidden) */}
            <aside className="session-sidebar">
                <h3>Members</h3>
                <ul className="members-list">
                    {session.members.map((member) => (
                        <li key={member.id} className="member-item">
                            <span className="member-name">{member.user.name}</span>
                            <span className={`member-role badge badge-${member.role.toLowerCase()}`}>
                                {member.role}
                            </span>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <h2>Invite to Session</h2>

                        <div className="form-group">
                            <label>Role</label>
                            <div className="role-selector">
                                <button
                                    type="button"
                                    className={`role-option ${inviteRole === 'VIEWER' ? 'active' : ''}`}
                                    onClick={() => setInviteRole('VIEWER')}
                                >
                                    <strong>Viewer</strong>
                                    <span>Can only watch the terminal</span>
                                </button>
                                <button
                                    type="button"
                                    className={`role-option ${inviteRole === 'OPERATOR' ? 'active' : ''}`}
                                    onClick={() => setInviteRole('OPERATOR')}
                                >
                                    <strong>Operator</strong>
                                    <span>Can type in the terminal</span>
                                </button>
                            </div>
                        </div>

                        {!inviteLink ? (
                            <button
                                className="btn btn-primary w-full"
                                onClick={handleCreateInvite}
                            >
                                Generate Invite Link
                            </button>
                        ) : (
                            <div className="invite-link-box">
                                <input
                                    type="text"
                                    value={inviteLink}
                                    readOnly
                                    className="invite-link-input"
                                />
                                <button className="btn btn-primary" onClick={handleCopyInvite}>
                                    Copy
                                </button>
                            </div>
                        )}

                        <button
                            className="btn btn-secondary w-full"
                            onClick={() => {
                                setShowInviteModal(false);
                                setInviteLink('');
                            }}
                            style={{ marginTop: 'var(--space-md)' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
