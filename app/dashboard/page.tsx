'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { sessionsApi } from '@/lib/api';
import { LogOut, Plus, MessageSquare, Settings, Loader2, Trash2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const { sessions, setSessions, deleteSession } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Wait for store to hydrate
    if (!hydrated) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    loadSessions();
  }, [user, router, hydrated]);

  const loadSessions = async () => {
    try {
      const response = await sessionsApi.getAll();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      setCreatingSession(true);
      const response = await sessionsApi.create();
      router.push(`/session/${response.data.id}?autoVoice=true`);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDeleteClick = (session: any, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    setSessionToDelete({
      id: session.id,
      name: session.metadata?.name || `Session ${session.id.slice(0, 8)}`,
    });
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;

    try {
      setDeletingSessionId(sessionToDelete.id);
      await sessionsApi.delete(sessionToDelete.id);
      deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const cancelDelete = () => {
    setSessionToDelete(null);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  Delete Session
                </h3>
                <p className="text-white/70 text-sm tracking-tight">
                  Are you sure you want to delete{' '}
                  <span className="text-white font-medium">"{sessionToDelete.name}"</span>?
                </p>
                <p className="text-white/50 text-xs mt-2 tracking-tight">
                  This action cannot be undone. All messages, memories, and tool executions will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                disabled={deletingSessionId === sessionToDelete.id}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed tracking-tight"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingSessionId === sessionToDelete.id}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 tracking-tight"
              >
                {deletingSessionId === sessionToDelete.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-tight">ORION</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/50 tracking-tight">{user.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 tracking-tight"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight">Sessions</h2>
          <button
            onClick={handleCreateSession}
            disabled={creatingSession}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-100 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed tracking-tight"
          >
            {creatingSession ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                New Session
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            <p className="text-white/50 mt-4 tracking-tight">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-lg border border-white/10">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/50" />
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
              No sessions yet
            </h3>
            <p className="text-white/50 mb-6 tracking-tight">
              Create a new session to start interacting with ORION
            </p>
            <button
              onClick={handleCreateSession}
              className="px-6 py-3 bg-white text-black hover:bg-gray-100 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 tracking-tight"
            >
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="group bg-white/5 rounded-lg border border-white/10 p-6 hover:border-white/20 transition-all duration-300 transform hover:scale-[1.02] relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-lg font-semibold text-white tracking-tight truncate">
                      {session.metadata?.name || `Session ${session.id.slice(0, 8)}`}
                    </h3>
                    <p className="text-sm text-white/50 mt-1 tracking-tight">
                      {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full tracking-tight ${
                      session.status === 'ACTIVE'
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-white/5 text-white/50 border border-white/10'
                    }`}
                  >
                    {session.status}
                  </span>
                    <button
                      onClick={(e) => handleDeleteClick(session, e)}
                      disabled={deletingSessionId === session.id}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete session"
                    >
                      {deletingSessionId === session.id ? (
                        <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
                {session._count && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                    <div title="Conversation history entries">
                      <p className="text-xs text-white/30 tracking-tight">Messages</p>
                      <p className="text-lg font-semibold text-white tracking-tight">{session._count.memories}</p>
                    </div>
                    <div title="API calls & functions executed">
                      <p className="text-xs text-white/30 tracking-tight">Tools</p>
                      <p className="text-lg font-semibold text-white tracking-tight">{session._count.toolExecutions}</p>
                    </div>
                    <div title="Session events (connects, disconnects)">
                      <p className="text-xs text-white/30 tracking-tight">Events</p>
                      <p className="text-lg font-semibold text-white tracking-tight">{session._count.events}</p>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
