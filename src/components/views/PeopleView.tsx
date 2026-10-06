import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PersonConnection, SearchResultUser, ConnectionRequestItem, BlockedUserItem, PresenceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Avatar,
  Badge,
  Button,
  Input,
  ListRow,
  Modal,
  EmptyState,
  Card,
  PeopleListSkeleton,
  PersonRowSkeleton,
} from '../ui';
import {
  IconConnect,
  IconHeart,
  IconSecurity,
  IconPeople,
  IconClose,
  IconCheck,
  IconBlock,
  IconUserMinus,
  IconChats,
  IconRotateCcw,
} from '../common/Icons';

interface PeopleViewProps {
  onStartChatWithPerson?: (person: any) => void;
}

export function PeopleView({ onStartChatWithPerson }: PeopleViewProps) {
  const { token, user: currentUser } = useAuth();

  // Primary data state
  const [connections, setConnections] = useState<PersonConnection[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequestItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultUser[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tab & Modal state
  const [activeTab, setActiveTab] = useState<'your_people' | 'close' | 'requests'>('your_people');
  const [selectedPerson, setSelectedPerson] = useState<PersonConnection | SearchResultUser | null>(null);
  const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Fetch connections and requests from backend
  const fetchAllPeopleData = useCallback(async () => {
    if (!token) return;

    try {
      const [connRes, reqRes, blockRes] = await Promise.all([
        fetch('/api/connections', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/connections/requests', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/users/blocked', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (connRes.ok) {
        const data = await connRes.json();
        setConnections(data.people || []);
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
      if (blockRes.ok) {
        const data = await blockRes.json();
        setBlockedUsers(data.blockedUsers || []);
      }
    } catch (err) {
      console.error('Error fetching people data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllPeopleData();
  }, [fetchAllPeopleData]);

  // Handle Search Query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      if (!token) return;
      try {
        const response = await fetch(
          `/api/people/search?q=${encodeURIComponent(trimmed)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Error during search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Derived sections
  const closePeople = useMemo(() => {
    return connections.filter((c) => c.isClose);
  }, [connections]);

  const hasPendingRequests = incomingRequests.length > 0 || outgoingRequests.length > 0;

  // -----------------------------------------------------------------
  // Backend Action Handlers
  // -----------------------------------------------------------------

  // 1. Send Connection Request
  const handleSendRequest = async (targetUserId: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);

    try {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.autoAccepted) {
          showToast('Mutual connection confirmed!');
        } else {
          showToast('Connection request sent.');
        }
        await fetchAllPeopleData();
        // Update search item status in place
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? {
                  ...u,
                  connectionStatus: data.autoAccepted
                    ? 'connected'
                    : 'outgoing_pending',
                  requestId: data.request?.id,
                }
              : u
          )
        );
      } else {
        showToast(data.error || 'Could not send request.');
      }
    } catch (err) {
      showToast('Network error sending request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Accept Request
  const handleAcceptRequest = async (requestId: string) => {
    if (!token) return;
    setActionLoadingId(requestId);

    try {
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        showToast('Connection accepted.');
        await fetchAllPeopleData();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to accept connection.');
      }
    } catch (err) {
      showToast('Network error accepting request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Decline Request
  const handleDeclineRequest = async (requestId: string) => {
    if (!token) return;
    setActionLoadingId(requestId);

    try {
      const response = await fetch('/api/connections/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        showToast('Connection request declined.');
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to decline request.');
      }
    } catch (err) {
      showToast('Network error declining request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Cancel Request (Sender)
  const handleCancelRequest = async (requestId: string, targetUserId?: string) => {
    if (!token) return;
    setActionLoadingId(requestId);

    try {
      const response = await fetch('/api/connections/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        showToast('Connection request cancelled.');
        setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (targetUserId) {
          setSearchResults((prev) =>
            prev.map((u) =>
              u.id === targetUserId
                ? { ...u, connectionStatus: 'none', requestId: undefined }
                : u
            )
          );
        }
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to cancel request.');
      }
    } catch (err) {
      showToast('Network error cancelling request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Toggle Close Status
  const handleToggleClose = async (targetUserId: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);

    try {
      const response = await fetch('/api/connections/toggle-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        const isNowClose = !!data.isClose;
        showToast(isNowClose ? 'Marked as Close person.' : 'Removed from Close.');

        setConnections((prev) =>
          prev.map((c) =>
            c.id === targetUserId ? { ...c, isClose: isNowClose } : c
          )
        );

        if (selectedPerson && selectedPerson.id === targetUserId) {
          setSelectedPerson((prev: any) =>
            prev ? { ...prev, isClose: isNowClose } : null
          );
        }
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update Close status.');
      }
    } catch (err) {
      showToast('Network error updating Close status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. Remove Connection
  const handleRemoveConnection = async (targetUserId: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);

    try {
      const response = await fetch(`/api/connections/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showToast('Connection removed.');
        setConnections((prev) => prev.filter((c) => c.id !== targetUserId));
        setSelectedPerson(null);
      } else {
        showToast('Failed to remove connection.');
      }
    } catch (err) {
      showToast('Network error removing connection.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 7. Block User
  const handleBlockUser = async (targetUserId: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);

    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        showToast('Person has been blocked. They cannot connect or message you.');
        setSelectedPerson(null);
        await fetchAllPeopleData();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to block person.');
      }
    } catch (err) {
      showToast('Network error blocking person.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 8. Unblock User
  const handleUnblockUser = async (targetUserId: string) => {
    if (!token) return;
    setActionLoadingId(targetUserId);

    try {
      const response = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        showToast('Person unblocked.');
        setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to unblock person.');
      }
    } catch (err) {
      showToast('Network error unblocking person.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper for human-readable presence status
  const getPresenceLabel = (presence: PresenceStatus | 'offline', shareOnline: boolean) => {
    if (!shareOnline) return 'Resting';
    switch (presence) {
      case 'here':
        return 'Present';
      case 'focus':
        return 'In Deep Focus';
      case 'quiet':
        return 'Quiet Hours';
      case 'walking':
        return 'Walking';
      case 'offline':
      default:
        return 'Resting';
    }
  };

  const isSearchingActive = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col min-h-full px-5 py-4 pb-24 max-w-md mx-auto w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-xs px-4 py-2 rounded-full bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 text-xs font-medium shadow-lg backdrop-blur-sm transition-all text-center">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-3">
        <div>
          <span className="text-[11px] font-medium tracking-widest uppercase text-zinc-500 dark:text-zinc-400 block mb-0.5">
            Private Circles
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            People
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {blockedUsers.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBlockedListOpen(true)}
              className="text-xs px-2.5 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              title="Manage Blocked People"
            >
              Blocked ({blockedUsers.length})
            </button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAllPeopleData}
            title="Refresh connections"
          >
            <IconRotateCcw className="w-4 h-4 text-zinc-500" />
          </Button>
        </div>
      </div>

      {/* Search People Input */}
      <div className="mb-3">
        <Input
          ref={searchInputRef}
          isSearch
          placeholder="Search by @username or display name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* ============================================================= */}
      {/* SEARCH RESULTS VIEW (When query is active) */}
      {/* ============================================================= */}
      {isSearchingActive ? (
        <div className="mt-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {isSearching ? 'Searching sanctuary...' : `Search results for "${searchQuery}"`}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Clear
            </button>
          </div>

          {isSearching ? (
            <div className="space-y-2 pt-1">
              <PersonRowSkeleton delayIndex={0} />
              <PersonRowSkeleton delayIndex={1} />
              <PersonRowSkeleton delayIndex={2} />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((person) => {
                const isActionLoading = actionLoadingId === person.id;

                return (
                  <div
                    key={person.id}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Avatar
                          initials={person.initials}
                          name={person.displayName}
                          size="md"
                          gradient={person.avatarColor}
                        />
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                            {person.displayName}
                          </h4>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            @{person.username}
                          </span>
                        </div>
                      </div>

                      {/* Connection Action Button */}
                      <div>
                        {person.connectionStatus === 'connected' && (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                            <IconCheck className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />
                            Connected
                          </span>
                        )}

                        {person.connectionStatus === 'outgoing_pending' && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              person.requestId &&
                              handleCancelRequest(person.requestId, person.id)
                            }
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <span>Requested</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 underline ml-0.5">
                              Cancel
                            </span>
                          </button>
                        )}

                        {person.connectionStatus === 'incoming_pending' && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isActionLoading}
                              onClick={() =>
                                person.requestId &&
                                handleAcceptRequest(person.requestId)
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isActionLoading}
                              onClick={() =>
                                person.requestId &&
                                handleDeclineRequest(person.requestId)
                              }
                            >
                              Decline
                            </Button>
                          </div>
                        )}

                        {person.connectionStatus === 'none' && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isActionLoading}
                            icon={<IconConnect className="w-3.5 h-3.5" />}
                            onClick={() => handleSendRequest(person.id)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {person.bio && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-11 pr-2 line-clamp-2">
                        {person.bio}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            !isSearching && (
              <EmptyState
                icon={<IconPeople className="w-6 h-6 text-zinc-400" />}
                title="Nobody here yet."
                description="Try another username."
                actionLabel="Clear Search"
                onAction={() => setSearchQuery('')}
              />
            )
          )}
        </div>
      ) : (
        /* ============================================================= */
        /* STANDARD CIRCLE VIEWS (When not searching) */
        /* ============================================================= */
        <>
          {/* Segment Selector */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('your_people')}
              className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'your_people'
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Your People ({connections.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('close')}
              className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'close'
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <IconHeart className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>Close People ({closePeople.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-medium'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 font-bold text-[10px] flex items-center justify-center">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="pt-1">
              <PeopleListSkeleton count={4} />
            </div>
          ) : (
            <>
              {/* ------------------------------------------------------------- */}
              {/* TAB: REQUESTS */}
              {/* ------------------------------------------------------------- */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {incomingRequests.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 px-1">
                    Incoming Requests ({incomingRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {incomingRequests.map((req) => {
                      const sender = req.sender;
                      if (!sender) return null;

                      return (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col gap-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Avatar
                                initials={sender.initials}
                                name={sender.displayName}
                                size="md"
                                gradient={sender.avatarColor}
                              />
                              <div>
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  {sender.displayName}
                                </h4>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                  @{sender.username}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAcceptRequest(req.id)}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDeclineRequest(req.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>

                          {sender.bio && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-11 pr-2">
                              {sender.bio}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2 px-1">
                    Pending Sent ({outgoingRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {outgoingRequests.map((req) => {
                      const receiver = req.receiver;
                      if (!receiver) return null;

                      return (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar
                              initials={receiver.initials}
                              name={receiver.displayName}
                              size="md"
                              gradient={receiver.avatarColor}
                            />
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {receiver.displayName}
                              </h4>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                @{receiver.username}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No requests empty state */}
              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <EmptyState
                  icon={<IconSecurity className="w-6 h-6 text-zinc-400" />}
                  title="You’re all caught up."
                  description="No pending connection requests in your sanctuary."
                  actionLabel="Find Someone"
                  onAction={() => searchInputRef.current?.focus()}
                />
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: CLOSE PEOPLE (Dedicated Close Section) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'close' && (
            <div className="space-y-3">
              <div className="px-1 mb-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Your most trusted confidants. Close connections also filter your active threads in Chats.
                </p>
              </div>

              {closePeople.length > 0 ? (
                <div className="space-y-1">
                  {closePeople.map((person) => (
                    <ListRow
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      leading={
                        <Avatar
                          initials={person.initials}
                          name={person.displayName}
                          presence={person.shareOnlineStatus ? person.presence : 'offline'}
                          size="md"
                          gradient={person.avatarColor}
                        />
                      }
                      title={person.displayName}
                      badge={
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 font-medium">
                          <IconHeart className="w-2.5 h-2.5 text-zinc-700 dark:text-zinc-300" />
                          Close
                        </span>
                      }
                      subtitle={`@${person.username} • ${getPresenceLabel(
                        person.onlineStatus,
                        person.shareOnlineStatus
                      )}`}
                      metadata={
                        person.statusMessage ? `"${person.statusMessage}"` : undefined
                      }
                      showChevron
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<IconHeart className="w-6 h-6 text-zinc-400" />}
                  title="No Close People yet"
                  description="Mark any connection as Close from their profile to place them in your inner sanctuary."
                  actionLabel="View All People"
                  onAction={() => setActiveTab('your_people')}
                />
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB: YOUR PEOPLE (All Accepted Connections) */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'your_people' && (
            <div className="space-y-4">
              {/* Highlight incoming requests banner if any */}
              {incomingRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className="w-full p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left flex items-center justify-between hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {incomingRequests.length} pending connection{' '}
                      {incomingRequests.length === 1 ? 'request' : 'requests'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Review →
                  </span>
                </button>
              )}

              {connections.length > 0 ? (
                <div className="space-y-1">
                  {connections.map((person) => (
                    <ListRow
                      key={person.id}
                      onClick={() => setSelectedPerson(person)}
                      leading={
                        <Avatar
                          initials={person.initials}
                          name={person.displayName}
                          presence={person.shareOnlineStatus ? person.presence : 'offline'}
                          size="md"
                          gradient={person.avatarColor}
                        />
                      }
                      title={person.displayName}
                      badge={
                        person.isClose ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 font-medium">
                            <IconHeart className="w-2.5 h-2.5 text-zinc-700 dark:text-zinc-300" />
                            Close
                          </span>
                        ) : undefined
                      }
                      subtitle={`@${person.username} • ${getPresenceLabel(
                        person.onlineStatus,
                        person.shareOnlineStatus
                      )}`}
                      metadata={
                        person.statusMessage ? `"${person.statusMessage}"` : undefined
                      }
                      showChevron
                    />
                  ))}
                </div>
              ) : (
                /* Requested empty state when user has no people yet */
                <EmptyState
                  icon={<IconPeople className="w-6 h-6 text-zinc-400" />}
                  title="Who’s among you?"
                  description="Find someone by username."
                  actionLabel="Search for People"
                  onAction={() => searchInputRef.current?.focus()}
                />
              )}
            </div>
          )}
            </>
          )}
        </>
      )}

      {/* ============================================================= */}
      {/* PERSON PROFILE SHEET (MODAL) */}
      {/* ============================================================= */}
      <Modal
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        title={selectedPerson?.displayName}
        subtitle={`@${selectedPerson?.username}`}
        variant="bottom-sheet"
      >
        {selectedPerson && (
          <div className="space-y-5 py-2">
            {/* Center Profile Presentation */}
            <div className="flex flex-col items-center text-center">
              <Avatar
                initials={selectedPerson.initials}
                name={selectedPerson.displayName}
                presence={
                  'shareOnlineStatus' in selectedPerson && !selectedPerson.shareOnlineStatus
                    ? 'offline'
                    : ('presence' in selectedPerson ? selectedPerson.presence : 'quiet')
                }
                size="xl"
                gradient={selectedPerson.avatarColor}
                className="mb-3"
              />

              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {selectedPerson.displayName}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                @{selectedPerson.username}
              </p>

              {/* Status / Close badges */}
              <div className="mt-3 flex items-center gap-2">
                {'isClose' in selectedPerson && selectedPerson.isClose && (
                  <Badge variant="subtle" size="md">
                    <IconHeart className="w-3 h-3 mr-1 inline text-zinc-700 dark:text-zinc-300" />
                    Close Person
                  </Badge>
                )}

                <Badge variant="subtle" size="md">
                  Status:{' '}
                  {'shareOnlineStatus' in selectedPerson && !selectedPerson.shareOnlineStatus
                    ? 'Resting'
                    : getPresenceLabel(
                        'onlineStatus' in selectedPerson
                          ? selectedPerson.onlineStatus
                          : 'presence' in selectedPerson
                          ? (selectedPerson as any).presence
                          : 'offline',
                        'shareOnlineStatus' in selectedPerson
                          ? selectedPerson.shareOnlineStatus
                          : true
                      )}
                </Badge>
              </div>
            </div>

            {/* Bio Card */}
            {selectedPerson.bio && (
              <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-medium">
                  Bio
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                  {selectedPerson.bio}
                </p>
              </div>
            )}

            {/* Current status message */}
            {'statusMessage' in selectedPerson && selectedPerson.statusMessage && (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 text-xs italic text-zinc-600 dark:text-zinc-300">
                "{selectedPerson.statusMessage}"
              </div>
            )}

            {/* Actions for connected people */}
            {'isClose' in selectedPerson && (
              <div className="space-y-2 pt-1">
                {/* 1. Mark as Close Toggle */}
                <Button
                  variant={selectedPerson.isClose ? 'secondary' : 'outline'}
                  fullWidth
                  icon={<IconHeart className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
                  onClick={() => handleToggleClose(selectedPerson.id)}
                >
                  {selectedPerson.isClose ? 'Remove from Close People' : 'Mark as Close Person'}
                </Button>

                {/* 2. Open Quiet Thread */}
                <Button
                  variant="primary"
                  fullWidth
                  icon={<IconChats className="w-4 h-4" />}
                  onClick={() => {
                    if (onStartChatWithPerson) {
                      onStartChatWithPerson({
                        id: selectedPerson.id,
                        name: selectedPerson.displayName,
                        relationship: selectedPerson.isClose ? 'Close' : 'Connection',
                        presence:
                          'onlineStatus' in selectedPerson
                            ? selectedPerson.onlineStatus
                            : 'here',
                        statusMessage:
                          'statusMessage' in selectedPerson
                            ? selectedPerson.statusMessage
                            : '',
                        avatarColor: selectedPerson.avatarColor,
                        initials: selectedPerson.initials,
                        isInnerCircle: !!selectedPerson.isClose,
                      });
                    }
                    setSelectedPerson(null);
                  }}
                >
                  Open Quiet Thread
                </Button>

                {/* 3. Remove connection */}
                <Button
                  variant="ghost"
                  fullWidth
                  icon={<IconUserMinus className="w-4 h-4 text-zinc-500" />}
                  onClick={() => handleRemoveConnection(selectedPerson.id)}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Remove Connection
                </Button>

                {/* 4. Block Person */}
                <Button
                  variant="ghost"
                  fullWidth
                  icon={<IconBlock className="w-4 h-4 text-zinc-500" />}
                  onClick={() => handleBlockUser(selectedPerson.id)}
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  Block Person
                </Button>
              </div>
            )}

            {/* Action for search user not yet connected */}
            {'connectionStatus' in selectedPerson &&
              selectedPerson.connectionStatus === 'none' && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    icon={<IconConnect className="w-4 h-4" />}
                    onClick={() => {
                      handleSendRequest(selectedPerson.id);
                      setSelectedPerson(null);
                    }}
                  >
                    Send Connection Request
                  </Button>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* ============================================================= */}
      {/* BLOCKED ACCOUNTS MODAL */}
      {/* ============================================================= */}
      <Modal
        isOpen={isBlockedListOpen}
        onClose={() => setIsBlockedListOpen(false)}
        title="Blocked People"
        subtitle="People who cannot message you or request connection"
        variant="bottom-sheet"
      >
        <div className="py-2 space-y-3">
          {blockedUsers.length > 0 ? (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {blockedUsers.map((b) => (
                <div
                  key={b.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={b.initials}
                      name={b.displayName}
                      size="sm"
                      gradient={b.avatarColor}
                    />
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {b.displayName}
                      </h4>
                      <span className="text-xs text-zinc-500 font-mono">
                        @{b.username}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUnblockUser(b.id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-6">
              You have not blocked anyone.
            </p>
          )}

          <div className="pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setIsBlockedListOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
