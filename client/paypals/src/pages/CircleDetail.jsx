import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Users, Clock, DollarSign, X, MapPin, Navigation, Target, Edit, Trash, UserMinus, UserPlus } from "lucide-react";

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-9 px-4 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-base",
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.default} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`} {...props}>{children}</div>
);

export default function CircleDetail() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [circle, setCircle] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMine, setFilterMine] = useState(false);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [selectedInviteUser, setSelectedInviteUser] = useState(null);
  const [inviteSearching, setInviteSearching] = useState(false);
  const inviteDebounceRef = useRef(null);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [showUpdateCircle, setShowUpdateCircle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(null);
  const [showUpdateRole, setShowUpdateRole] = useState(null);
  const [circleForm, setCircleForm] = useState({ name: '', type: 'friends' });
  const [circleFormError, setCircleFormError] = useState(null);
  const [circleFormLoading, setCircleFormLoading] = useState(false);

  // Transaction modal state
  const [showCreate, setShowCreate] = useState(false);
  const [txForm, setTxForm] = useState({
    name: '',
    description: '',
    total_amount: '',
    splitEven: true,
    participants: [],
    place_id: '',
    location_lat: '',
    location_lng: '',
  });
  const [creating, setCreating] = useState(false);
  const [txError, setTxError] = useState(null);
  const [placeSearchResults, setPlaceSearchResults] = useState([]);
  const [searchLat, setSearchLat] = useState('');
  const [searchLng, setSearchLng] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const debounceRef = useRef(null);

  // Define visibleTransactions
  const visibleTransactions = filterMine
    ? transactions.filter(t => t.is_user_participant || (t.members || []).some(m => m.user_id === currentUser?.id))
    : transactions;

  const fetchUserCircles = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/circles/user`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) {
        if (res.status === 401) navigate('/login');
        throw new Error('Failed to load circles');
      }
      const json = await res.json();
      setCircles(json.data || []);
      if (!selectedCircleId && (json.data || []).length > 0) {
        setSelectedCircleId((json.data || [])[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [selectedCircleId, navigate]);

  const fetchCircle = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [circleRes, txRes] = await Promise.all([
        fetch(`${apiBase}/circles/${id}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }),
        fetch(`${apiBase}/transactions/circle/${id}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }),
      ]);
      if (!circleRes.ok) {
        if (circleRes.status === 401) navigate('/login');
        throw new Error('Failed to load circle');
      }
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const circleJson = await circleRes.json();
      const txJson = await txRes.json();
      setCircle(circleJson.data || circleJson);
      setTransactions(txJson.data?.transactions || txJson.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const createCircle = async (e) => {
    e.preventDefault();
    setCircleFormError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: circleForm.name,
          type: circleForm.type,
          created_by: currentUser.user_id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create circle');
      await fetchUserCircles();
      setShowCreateCircle(false);
      setCircleForm({ name: '', type: 'friends' });
      setSuccessMessage('Circle created successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setCircleFormError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const updateCircle = async (e) => {
    e.preventDefault();
    setCircleFormError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: circleForm.name,
          type: circleForm.type,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update circle');
      await fetchCircle(selectedCircleId);
      setShowUpdateCircle(false);
      setCircleForm({ name: '', type: 'friends' });
      setSuccessMessage('Circle updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setCircleFormError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const deleteCircle = async () => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete circle');
      await fetchUserCircles();
      setSelectedCircleId(null);
      setCircle(null);
      setTransactions([]);
      setShowDeleteConfirm(false);
      setSuccessMessage('Circle deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const leaveCircle = async () => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to leave circle');
      await fetchUserCircles();
      setSelectedCircleId(null);
      setCircle(null);
      setTransactions([]);
      setShowLeaveConfirm(false);
      setSuccessMessage('You have left the circle');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const removeMember = async (memberId) => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/members/${memberId}/remove`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove member');
      await fetchCircle(selectedCircleId);
      setShowRemoveMember(null);
      setSuccessMessage('Member removed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    setError(null);
    setCircleFormLoading(true);
    try {
      const res = await fetch(`${apiBase}/circles/${selectedCircleId}/members/${memberId}/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update member role');
      await fetchCircle(selectedCircleId);
      setShowUpdateRole(null);
      setSuccessMessage('Member role updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCircleFormLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchUserCircles();
  }, [currentUser, fetchUserCircles, navigate]);

  useEffect(() => {
    if (selectedCircleId) fetchCircle(selectedCircleId);
  }, [selectedCircleId, fetchCircle]);

  useEffect(() => {
    if (circle && circle.members) {
      // Keep amounts as strings so inputs can be cleared/backspaced by the user
      const defaultParticipants = (circle.members || []).map(m => ({
        user_id: m.user_id || m.id,
        username: m.user?.username || m.username || m.name || m.email || String(m.user_id || m.id),
        amount_owed: '',
        include: true,
        user: m.user || { id: m.user_id, username: m.user?.username || 'Unknown' }
      }));
      setTxForm(f => ({ ...f, participants: defaultParticipants }));
    }
  }, [circle]);

  const circleCentroid = useMemo(() => {
    if (!circle || !circle.members) return null;
    const pts = (circle.members || []).map(m => {
      const lat = parseFloat(m.location_lat || m.lat || m.latitude || 0);
      const lng = parseFloat(m.location_lng || m.lng || m.longitude || 0);
      return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null;
    }).filter(Boolean);
    if (pts.length === 0) return null;
    const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const avgLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat: avgLat, lng: avgLng };
  }, [circle]);

  const updateParticipantInclude = (user_id, include) => {
  if (currentUser && String(user_id) === String(currentUser.user_id)) return;
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => p.user_id === user_id ? { ...p, include } : p),
    }));
  };

  const updateParticipantAmount = (user_id, amount) => {
    // Keep raw input string to allow clearing/backspace; parse at validation/submission
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => p.user_id === user_id ? { ...p, amount_owed: amount } : p),
    }));
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setTxError(null);
    if (!selectedCircleId) return setTxError('No circle selected');
    const total = parseFloat(txForm.total_amount);
    if (!txForm.name || !total || total <= 0) return setTxError('Please provide a name and a valid total amount');

    const included = txForm.participants.filter(p => p.include);
    if (included.length === 0) return setTxError('Select at least one participant');

    if (currentUser) {
      const creatorIncluded = included.some(p => String(p.user_id) === String(currentUser.user_id));
      if (!creatorIncluded) return setTxError('Transaction creator must be included as a participant');
    }

    let participantsPayload = [];
    if (txForm.splitEven) {
      const share = parseFloat((total / included.length).toFixed(2));
      let running = 0;
      included.forEach((p, idx) => {
        const amount = idx === included.length - 1 ? parseFloat((total - running).toFixed(2)) : share;
        running += amount;
        participantsPayload.push({ user_id: String(p.user_id), amount_owed: amount });
      });
    } else {
      // Sum participant amounts using numeric parsing (empty strings count as 0)
      const sum = included.reduce((s, p) => s + (parseFloat(p.amount_owed) || 0), 0);
      if (Math.abs(sum - total) > 0.01) return setTxError('Sum of participant amounts must equal total amount');
      participantsPayload = included.map(p => ({ user_id: String(p.user_id), amount_owed: parseFloat(p.amount_owed) || 0 }));
    }

    const payload = {
      name: txForm.name,
      description: txForm.description,
      total_amount: total,
      participants: participantsPayload,
    };
    if (selectedPlace && selectedPlace.place_id) payload.place_id = selectedPlace.place_id;
    else if (txForm.location_lat && txForm.location_lng) {
      payload.location_lat = txForm.location_lat;
      payload.location_lng = txForm.location_lng;
    }

    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/transactions/${selectedCircleId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create transaction');
      await fetchCircle(selectedCircleId);
      setShowCreate(false);
      setTxForm({
        name: '',
        description: '',
        total_amount: '',
        splitEven: true,
        participants: txForm.participants.map(p => ({ ...p, amount_owed: '', include: true })),
        place_id: '',
        location_lat: '',
        location_lng: '',
      });
      setPlaceSearchResults([]);
      setSearchQuery('');
      setSearchLat('');
      setSearchLng('');
      setSelectedPlace(null);
      setSuccessMessage('Transaction created');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setTxError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const performSearch = async ({ query, lat, lng, radius = 1000 } = {}) => {
    setSearchingPlaces(true);
    setPlaceSearchResults([]);
    try {
      let url = '';
      if (query && query.trim().length > 0) {
        url = `${apiBase}/maps/search?query=${encodeURIComponent(query)}&radius=${radius}`;
      } else if (lat && lng) {
        url = `${apiBase}/maps/search?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${radius}`;
      } else return;
      const res = await fetch(url, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setPlaceSearchResults(json.data || []);
    } catch (err) {
      setTxError(err.message || 'Place search failed');
    } finally {
      setSearchingPlaces(false);
    }
  };

  useEffect(() => {
    if ((!searchQuery || searchQuery.trim() === '') && !searchLat && !searchLng) {
      setPlaceSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch({ query: searchQuery, lat: searchLat, lng: searchLng });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchLat, searchLng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setTxError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSearchLat(String(lat));
        setSearchLng(String(lng));
        performSearch({ lat, lng });
      },
      err => setTxError(err.message || 'Failed to get location')
    );
  };

  const useCircleCentroid = () => {
    if (circleCentroid) {
      setSearchLat(String(circleCentroid.lat));
      setSearchLng(String(circleCentroid.lng));
      performSearch({ lat: circleCentroid.lat, lng: circleCentroid.lng });
    }
  };

  const isAdmin = circle?.members?.find(m => m.user.user_id === currentUser?.id)?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Circles</h1>
            <p className="text-sm text-slate-600">Select a circle to view members and transactions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={selectedCircleId || ''}
              onChange={(e) => setSelectedCircleId(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            >
              <option value="">Select circle</option>
              {circles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.memberCount || 0})
                </option>
              ))}
            </select>
            <Button variant="primary" size="sm" onClick={() => setShowCreateCircle(true)}>
              Create Circle
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  {isAdmin && (
                    <div className="w-full sm:w-auto">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search username or enter email to invite"
                          value={inviteQuery}
                          onChange={e => {
                            const v = e.target.value;
                            setInviteQuery(v);
                            setInviteEmail(v);
                            setSelectedInviteUser(null);
                            setInviteError('');
                            // debounce search
                            if (inviteDebounceRef.current) clearTimeout(inviteDebounceRef.current);
                            if (!v || v.trim() === '') {
                              setInviteResults([]);
                              return;
                            }
                            inviteDebounceRef.current = setTimeout(async () => {
                              setInviteSearching(true);
                              try {
                                const res = await fetch(`${apiBase}/users/search?q=${encodeURIComponent(v)}`, {
                                  credentials: 'include',
                                  headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
                                });
                                const json = await res.json();
                                if (res.ok && Array.isArray(json.data)) {
                                  setInviteResults(json.data || []);
                                  console.debug('invite search results', json.data || []);
                                } else {
                                  setInviteResults([]);
                                }
                              } catch (err) {
                                setInviteResults([]);
                              } finally {
                                setInviteSearching(false);
                              }
                            }, 300);
                          }}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                        />
                        {inviteResults.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-sm z-50 max-h-40 overflow-auto">
                            {inviteResults.map(u => (
                              <div
                                key={u.id}
                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                                onClick={() => {
                                  setSelectedInviteUser(u);
                                  setInviteQuery(u.username);
                                  setInviteEmail(u.email || '');
                                  setInviteResults([]);
                                }}
                              >
                                <div className="font-medium">{u.username}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={async () => {
                            // If a user was selected, invite by id; otherwise fallback to email
                            setInviteError('');
                            setInviteSuccess('');
                            if (!selectedCircleId) return setInviteError('No circle selected');
                            if (!selectedInviteUser && (!inviteEmail || inviteEmail.indexOf('@') === -1)) {
                              setInviteError('Select a user or enter a valid email');
                              return;
                            }
                            setInviteLoading(true);
                            try {
                              const body = selectedInviteUser ? { inviteeId: selectedInviteUser.id } : { email: inviteEmail };
                              const res = await fetch(`${apiBase}/invitations/${selectedCircleId}`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                                },
                                body: JSON.stringify(body),
                              });
                              const json = await res.json().catch(() => null);
                              if (!res.ok) throw new Error((json && (json.message || json.error)) || 'Failed to send invitation');
                              setInviteSuccess('Invitation sent');
                              // optionally show toast if react-toastify is available
                              try { if (window && window.toast) window.toast.success && window.toast.success('Invitation sent'); } catch(e){}
                              setInviteQuery('');
                              setInviteEmail('');
                              setSelectedInviteUser(null);
                              setInviteResults([]);
                              setTimeout(() => setInviteSuccess(''), 3000);
                            } catch (err) {
                              setInviteError(err.message || String(err));
                            } finally {
                              setInviteLoading(false);
                            }
                          }}
                          className="w-full sm:w-auto"
                        >
                          {inviteLoading ? 'Sending...' : 'Invite'}
                        </Button>
                        {selectedInviteUser && (
                          <div className="text-sm text-slate-600">Selected: <span className="font-medium">{selectedInviteUser.username}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedCircleId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCircleForm({ name: circle?.name || '', type: circle?.type || 'friends' });
                        setShowUpdateCircle(true);
                      }}
                      disabled={!isAdmin}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  )}
                  {selectedCircleId && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={!isAdmin}
                    >
                      <Trash className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-8 bg-slate-100 rounded"></div>
                  <div className="h-8 bg-slate-100 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                      {(circle?.members || []).length === 0 ? (
                        <p className="text-sm text-slate-600">No members found</p>
                      ) : (
                        <div className="space-y-3">
                          {(circle.members || []).map(m => (
                            <div key={m.user_id || m.id} className="p-3 bg-white rounded-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                                  {(m.user?.username || m.username || m.name || '?').slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
                                    {m.user?.username || m.username || m.name || m.email}
                                    <span className="ml-2 text-sm text-slate-500">({m.role})</span>
                                  </div>
                                  <div className="text-sm text-slate-500">{m.user?.email || m.email || ''}</div>
                                </div>
                              </div>
                              {isAdmin && m.user_id !== currentUser.user_id && (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowUpdateRole({ memberId: m.user_id, currentRole: m.role })}
                                    className="w-full sm:w-auto"
                                  >
                                    <UserPlus className="w-4 h-4 mr-1" /> Role
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setShowRemoveMember(m.user_id)}
                                    className="w-full sm:w-auto"
                                  >
                                    <UserMinus className="w-4 h-4 mr-1" /> Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  {inviteError && <div className="mt-2 text-sm text-red-600">{inviteError}</div>}
                  {inviteSuccess && <div className="mt-2 text-sm text-green-600">{inviteSuccess}</div>}
                </>
              )}
              {selectedCircleId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="mt-4"
                >
                  <UserMinus className="w-4 h-4 mr-1" /> Leave Circle
                </Button>
              )}
            </Card>
          </div>

          <div>
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
                <div className="text-sm text-slate-600">Manage transactions for this circle</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 mr-2">Show only my transactions</label>
                <input type="checkbox" checked={filterMine} onChange={() => setFilterMine(f => !f)} />
                <Button variant="primary" className="ml-3" onClick={() => setShowCreate(true)}>
                  Create Transaction
                </Button>
              </div>
            </div>

            <Card className="p-4">
              <div>
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-slate-100 rounded"></div>
                    <div className="h-12 bg-slate-100 rounded"></div>
                  </div>
                ) : visibleTransactions.length === 0 ? (
                  <div className="text-center p-8 text-slate-600">
                    <div className="mx-auto w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                      <DollarSign className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-medium">No transactions</p>
                    <p className="text-sm">Create the first transaction for this circle</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleTransactions.map(tx => (
                      <div key={tx.id} className="p-4 bg-white rounded-md shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">{tx.description || tx.name || 'Transaction'}</div>
                            <div className="text-sm text-slate-500 mt-1">{new Date(tx.created_at).toLocaleString()}</div>
                            <div className="text-sm text-slate-500 mt-1">Participants: {(tx.members || []).length}</div>
                          </div>
                          <div className="text-right mt-2 sm:mt-0">
                            <div className="text-lg sm:text-xl font-bold text-slate-900">${(parseFloat(tx.total_amount || tx.amount || 0) || 0).toFixed(2)}</div>
                            {tx.is_user_participant && <div className="text-sm text-green-600">Involving you</div>}
                          </div>
                        </div>
                        {(tx.members || []).length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm text-slate-600 mb-2">Breakdown</div>
                            <div className="flex flex-wrap gap-2">
                              {(tx.members || []).map((m, idx) => {
                                const memberName =
                                  m.user?.username ||
                                  m.username ||
                                  m.name ||
                                  ((circle?.members || []).find(cm => (cm.user_id || cm.id) === (m.user_id || m.id)) || {}).username ||
                                  (m.user_id || m.id) ||
                                  `member-${idx}`;
                                const amt = parseFloat(m.amount_owed ?? m.amount_paid ?? m.amount ?? 0) || 0;
                                const key = `${tx.id}-${m.user_id || m.id || idx}`;
                                return (
                                  <div key={key} className="px-3 py-1 bg-slate-100 rounded text-sm text-slate-700">
                                    <span className="font-medium">{memberName}</span>
                                    <span className="ml-2 text-slate-900">${amt.toFixed(2)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Create Circle Modal */}
            {showCreateCircle && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Create New Circle</h3>
                    <button onClick={() => setShowCreateCircle(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <form onSubmit={createCircle} className="space-y-4">
                      {circleFormError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {circleFormError}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Circle Name *</label>
                        <input
                          value={circleForm.name}
                          onChange={e => setCircleForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          placeholder="e.g. Friends Group"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Type *</label>
                        <select
                          value={circleForm.type}
                          onChange={e => setCircleForm(f => ({ ...f, type: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          <option value="friends">Friends</option>
                          <option value="family">Family</option>
                          <option value="roommates">Roommates</option>
                          <option value="travel">Travel</option>
                          <option value="project">Project</option>
                          <option value="colleagues">Colleagues</option>
                          <option value="couple">Couple</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowCreateCircle(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={circleFormLoading}>
                          {circleFormLoading ? 'Creating...' : 'Create Circle'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Update Circle Modal */}
            {showUpdateCircle && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Update Circle</h3>
                    <button 
                      onClick={() => setShowUpdateCircle(false)} 
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <form onSubmit={updateCircle} className="space-y-5">
                      {circleFormError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
                          {circleFormError}
                        </div>
                      )}
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Circle Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={circleForm.name}
                            onChange={e => setCircleForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Friends Group"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={circleForm.type}
                            onChange={e => setCircleForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="friends">Friends</option>
                        <option value="family">Family</option>
                        <option value="roommates">Roommates</option>
                        <option value="travel">Travel</option>
                        <option value="project">Project</option>
                        <option value="colleagues">Colleagues</option>
                        <option value="couple">Couple</option>
                          </select>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowUpdateCircle(false)}
                          className="min-w-[100px]"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          disabled={circleFormLoading}
                          className="min-w-[120px]"
                        >
                          {circleFormLoading ? 'Updating...' : 'Update Circle'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Circle Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Delete Circle</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to delete this circle? This action cannot be undone.
                    </p>
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={deleteCircle}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Circle Confirmation */}
            {showLeaveConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Leave Circle</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to leave this circle? You will lose access to its transactions and members.
                    </p>
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowLeaveConfirm(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={leaveCircle}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Leaving...' : 'Leave'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Member Confirmation */}
            {showRemoveMember && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Remove Member</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-slate-600">
                      Are you sure you want to remove this member from the circle?
                    </p>
                    {error && (
                      <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowRemoveMember(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeMember(showRemoveMember)}
                        disabled={circleFormLoading}
                      >
                        {circleFormLoading ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Update Member Role Modal */}
            {showUpdateRole && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">Update Member Role</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">Select a new role for the member:</p>
                      <select
                        value={showUpdateRole.currentRole}
                        onChange={e => setShowUpdateRole(r => ({ ...r, currentRole: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {error}
                        </div>
                      )}
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowUpdateRole(null)}>
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => updateMemberRole(showUpdateRole.memberId, showUpdateRole.currentRole)}
                          disabled={circleFormLoading}
                        >
                          {circleFormLoading ? 'Updating...' : 'Update Role'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Transaction Modal */}
            {showCreate && (
              <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-20">
                    <h3 className="text-xl font-semibold text-slate-900">Create Transaction</h3>
                    <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleCreateTransaction} className="space-y-6 pb-28">
                      {successMessage && (
                        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                          {successMessage}
                        </div>
                      )}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900">Transaction Details</h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Name *</label>
                          <input
                            value={txForm.name}
                            onChange={e => setTxForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="e.g. Dinner at restaurant"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                          <input
                            value={txForm.description}
                            onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                            placeholder="Additional details (optional)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Total Amount *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="^\d+(\.\d{1,2})?$"
                              value={txForm.total_amount ?? ''}
                              onChange={e => setTxForm(f => ({ ...f, total_amount: e.target.value }))}
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Location (Optional)
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Search Places</label>
                          <input
                            placeholder="e.g. 'Starbucks', 'restaurant', 'mall'"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => performSearch({ query: searchQuery, lat: searchLat, lng: searchLng })}
                            disabled={searchingPlaces}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4" />
                            {searchingPlaces ? 'Searching...' : 'Search Places'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={useMyLocation}
                            className="flex items-center gap-2"
                          >
                            <Navigation className="w-4 h-4" />
                            Use My Location
                          </Button>
                          {circleCentroid && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={useCircleCentroid}
                              className="flex items-center gap-2"
                            >
                              <Target className="w-4 h-4" />
                              Circle Center
                            </Button>
                          )}
                        </div>
                        {placeSearchResults.length > 0 && (
                          <div className="border border-slate-200 rounded-md bg-white max-h-48 overflow-auto">
                            <div className="p-2">
                              <div className="text-sm font-medium text-slate-700 mb-2">Select a location:</div>
                              {placeSearchResults.map(p => {
                                const isSelected = selectedPlace && (selectedPlace.place_id === p.place_id || selectedPlace.placeId === p.place_id);
                                return (
                                  <div
                                    key={p.place_id}
                                    className={`p-3 cursor-pointer rounded-md transition-colors ${
                                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                                    onClick={() => {
                                      setSelectedPlace(p);
                                      // Close the place search list and clear query
                                      setPlaceSearchResults([]);
                                      setSearchQuery('');
                                    }}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-600">{p.vicinity || p.formatted_address}</div>
                                      </div>
                                      {isSelected && (
                                        <div className="text-xs text-blue-600 font-medium">Selected</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {selectedPlace && (
                          <div className="p-4 border border-blue-200 rounded-md bg-blue-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  {selectedPlace.name}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">{selectedPlace.vicinity || selectedPlace.formatted_address}</div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlace(null);
                                  setPlaceSearchResults([]);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="splitEven"
                            checked={txForm.splitEven}
                            onChange={e => setTxForm(f => ({ ...f, splitEven: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="splitEven" className="text-sm font-medium text-slate-700">
                            Split amount evenly among participants
                          </label>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Participants
                        </h4>
                        <div className="text-xs text-slate-600">The creator of the transaction must be included and cannot be removed.</div>
                        <div className="space-y-3 max-h-60 overflow-auto border border-slate-200 rounded-md p-4 bg-slate-50">
                          {txForm.participants.map(p => {
                            const isCreator = currentUser && (
                                String(p.user_id) === String(currentUser.user_id) || 
                                String(p.user?.id) === String(currentUser.user_id)
                            );
                            return (
                              <div key={p.user_id} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 p-3 bg-white rounded-md border border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={p.include}
                                  onChange={e => updateParticipantInclude(p.user_id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  disabled={isCreator}
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    {p.username} {isCreator && <span className="text-xs text-slate-500">(creator)</span>}
                                  </div>
                                </div>
                                {!txForm.splitEven && p.include && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={p.amount_owed}
                                      onChange={e => updateParticipantAmount(p.user_id, e.target.value)}
                                      className="w-full sm:w-20 px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-900"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {!txForm.splitEven && (
                          <div className="text-xs text-slate-600 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <strong>Note:</strong> When not splitting evenly, the sum of all participant amounts must equal the total amount.
                          </div>
                        )}
                      </div>
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 -mb-6 px-6 py-4 z-30">
                        {txError && (
                          <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                            {txError}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" variant="primary" disabled={creating}>
                            {creating ? 'Creating...' : 'Create Transaction'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}