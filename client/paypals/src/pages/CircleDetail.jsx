import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../components/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { Users, Clock, DollarSign, X, MapPin, Navigation, Target } from "lucide-react";

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
    lg: "h-11 px-6 text-base"
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

  const fetchUserCircles = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/circles/user`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load circles');
      const json = await res.json();
      setCircles(json.data || []);
      if (!selectedCircleId && (json.data || []).length > 0) {
        setSelectedCircleId((json.data || [])[0].id);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [selectedCircleId]);

  const fetchCircle = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [circleRes, txRes] = await Promise.all([
        fetch(`${apiBase}/circles/${id}`, { credentials: 'include' }),
        fetch(`${apiBase}/transactions/circle/${id}`, { credentials: 'include' }),
      ]);
      if (!circleRes.ok) throw new Error('Failed to load circle');
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
  }, []);

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

  const visibleTransactions = filterMine
    ? transactions.filter(t => t.is_user_participant || (t.members || []).some(m => m.user_id === currentUser?.id))
    : transactions;

  // Create transaction modal state
  const [showCreate, setShowCreate] = useState(false);
  const [txForm, setTxForm] = useState({
    name: '',
    description: '',
    total_amount: '',
    splitEven: true,
    participants: [], // { user_id, amount_owed, include }
    place_id: '',
    location_lat: '',
    location_lng: ''
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

  useEffect(() => {
    if (circle && circle.members) {
      // include username for display/selection while keeping user_id for payload
      const defaultParticipants = (circle.members || []).map(m => ({
        user_id: m.user_id || m.id,
        username: m.username || m.name || m.email || String(m.user_id || m.id),
        amount_owed: 0,
        include: true
      }));
      setTxForm(f => ({ ...f, participants: defaultParticipants }));
    }
  }, [circle]);

  // compute centroid from circle members if available (optional prefill)
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

  const updateParticipantInclude = (identifier, include) => {
    // Prevent unselecting the transaction creator
    const isCreator = currentUser && (identifier == currentUser.id || identifier === currentUser.username);
    if (isCreator) return; // silently ignore attempts to unselect creator (UI also disables the checkbox)
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => ((p.username && p.username === identifier) || p.user_id === identifier) ? { ...p, include } : p)
    }));
  };

  const updateParticipantAmount = (identifier, amount) => {
    setTxForm(f => ({
      ...f,
      participants: f.participants.map(p => ((p.username && p.username === identifier) || p.user_id === identifier) ? { ...p, amount_owed: parseFloat(amount) || 0 } : p)
    }));
  };

  const handleCreateTransaction = async (e) => {
    e && e.preventDefault();
    setTxError(null);
    if (!selectedCircleId) return setTxError('No circle selected');
    const total = parseFloat(txForm.total_amount);
    if (!txForm.name || !total || total <= 0) return setTxError('Please provide a name and a valid total amount');

    const included = txForm.participants.filter(p => p.include);
    if (included.length === 0) return setTxError('Select at least one participant');

    // Ensure the creator (currentUser) is included
    if (currentUser) {
      const creatorIncluded = included.some(p => p.user_id === currentUser.id || p.username === currentUser.username);
      if (!creatorIncluded) return setTxError('Transaction creator must be included as a participant');
    }

    // prepare participants amounts
    let participantsPayload = [];
    if (txForm.splitEven) {
      const share = parseFloat((total / included.length).toFixed(2));
      // adjust last share to match total
      let running = 0;
      included.forEach((p, idx) => {
        const amount = (idx === included.length - 1) ? parseFloat((total - running).toFixed(2)) : share;
        running += amount;
        participantsPayload.push({ user_id: p.user_id, amount_owed: amount });
      });
    } else {
      const sum = included.reduce((s, p) => s + (p.amount_owed || 0), 0);
      if (Math.abs(sum - total) > 0.01) return setTxError('Sum of participant amounts must equal total amount');
      participantsPayload = included.map(p => ({ user_id: p.user_id, amount_owed: p.amount_owed }));
    }

    // payload
    const payload = {
      name: txForm.name,
      description: txForm.description,
      total_amount: total,
      participants: participantsPayload
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to create transaction');
      // refresh
      await fetchCircle(selectedCircleId);
      setShowCreate(false);
      // reset form and clear search/selection
      setTxForm({ name: '', description: '', total_amount: '', splitEven: true, participants: txForm.participants.map(p => ({ ...p, amount_owed: 0, include: true })), place_id: '', location_lat: '', location_lng: '' });
      setPlaceSearchResults([]);
      setSearchQuery('');
      setSearchLat('');
      setSearchLng('');
      setSelectedPlace(null);
      setSuccessMessage('Transaction created');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setTxError(err.message || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  // perform search helper
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
      const res = await fetch(url, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Search failed');
      setPlaceSearchResults(json.data || []);
    } catch (err) {
      setTxError(err.message || 'Place search failed');
    } finally {
      setSearchingPlaces(false);
    }
  };

  // debounce search when user types a query
  useEffect(() => {
    if ((!searchQuery || searchQuery.trim() === '') && !searchLat && !searchLng) {
      setPlaceSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch({ query: searchQuery, lat: searchLat, lng: searchLng });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchLat, searchLng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setTxError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setSearchLat(String(lat));
      setSearchLng(String(lng));
      performSearch({ lat, lng });
    }, err => setTxError(err.message || 'Failed to get location'));
  };

  const useCircleCentroid = () => {
    if (circleCentroid) {
      setSearchLat(String(circleCentroid.lat));
      setSearchLng(String(circleCentroid.lng));
      performSearch({ lat: circleCentroid.lat, lng: circleCentroid.lng });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Circles</h1>
            <p className="text-sm text-slate-600">Select a circle to view members and transactions</p>
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={selectedCircleId || ''}
              onChange={(e) => setSelectedCircleId(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            >
              <option value="">Select circle</option>
              {circles.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.members?.length || c.member_count || 0})</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Members</h2>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-8 bg-slate-100 rounded"></div>
                  <div className="h-8 bg-slate-100 rounded"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(circle?.members || []).length === 0 ? (
                    <p className="text-sm text-slate-600">No members found</p>
                  ) : (
                    (circle.members || []).map(m => (
                      <div key={m.user_id || m.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                          {(m.user?.username || m.username || m.name || '?').slice(0,1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {m.user?.username || m.username || m.name || m.email}
                          </div>
                          <div className="text-xs text-slate-500">{m.user?.email || m.email || ''}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
                <div className="text-sm text-slate-600">Manage transactions for this circle</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 mr-2">Show only my transactions</label>
                <input type="checkbox" checked={filterMine} onChange={() => setFilterMine(f => !f)} />
                <Button variant="primary" className="ml-3" onClick={() => setShowCreate(true)}>Create Transaction</Button>
              </div>
            </div>

            <Card>
              <div className="p-4">
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
                  <div className="divide-y divide-slate-100">
                    {visibleTransactions.map(tx => (
                      <div key={tx.id} className="py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{tx.description || tx.name || 'Transaction'}</div>
                            <div className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Participants: {(tx.members || []).length}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">${(parseFloat(tx.total_amount || tx.amount || 0) || 0).toFixed(2)}</div>
                            {tx.is_user_participant && <div className="text-xs text-green-600">Involving you</div>}
                          </div>
                        </div>

                        {/* Per-member amounts */}
                        {(tx.members || []).length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-slate-600 mb-2">Breakdown:</div>
                            <div className="flex flex-wrap gap-2">
                              {(tx.members || []).map((m, idx) => {
                                // Resolve display name from member object, or fallback to circle members
                                const memberName = m.user?.username || m.username || m.name ||
                                  ((circle?.members || []).find(cm => (cm.user_id || cm.id) === (m.user_id || m.id)) || {}).username || (m.user_id || m.id) || `member-${idx}`;
                                const amt = parseFloat(m.amount_owed ?? m.amount_paid ?? m.amount ?? 0) || 0;
                                const key = `${tx.id}-${m.user_id || m.id || idx}`;
                                return (
                                  <div key={key} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
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

            {/* Create Transaction Modal */}
            {showCreate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">Create Transaction</h3>
                    <button 
                      onClick={() => setShowCreate(false)} 
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    <form onSubmit={handleCreateTransaction} className="space-y-6">
                      {/* Success Message */}
                      {successMessage && (
                        <div className="px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                          {successMessage}
                        </div>
                      )}

                      {/* Error Message */}
                      {txError && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                          {txError}
                        </div>
                      )}

                      {/* Basic Details */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900">Transaction Details</h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Transaction Name *</label>
                          <input 
                            value={txForm.name} 
                            onChange={e => setTxForm(f => ({ ...f, name: e.target.value }))} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="e.g. Dinner at restaurant"
                            required 
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                          <input 
                            value={txForm.description} 
                            onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="Additional details (optional)"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Total Amount *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              value={txForm.total_amount} 
                              onChange={e => setTxForm(f => ({ ...f, total_amount: e.target.value }))} 
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                              placeholder="0.00"
                              required 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Section */}
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          />
                        </div>

                        {/* Location Action Buttons */}
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

                        {/* Place Search Results */}
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
                                      isSelected 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : 'hover:bg-slate-50 border border-transparent'
                                    }`} 
                                    onClick={() => setSelectedPlace(p)}
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

                        {/* Selected Place Display */}
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
                                onClick={() => { setSelectedPlace(null); setPlaceSearchResults([]); }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Split Configuration */}
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

                      {/* Participants */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Participants
                        </h4>
                        
                        <div className="space-y-2 text-xs text-slate-600">The creator of the transaction must be included and cannot be removed.</div>
                        <div className="space-y-3 max-h-60 overflow-auto border border-slate-200 rounded-md p-4 bg-slate-50">
                          {txForm.participants.map(p => {
                            const member = (circle?.members || []).find(m => (m.user_id || m.id) === p.user_id) || {};
                            const displayName = member.user.username;
                            const identifier = member.user.username;
                            const isCreator = currentUser && (identifier === currentUser.username);
                            return (
                              <div key={identifier} className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                                <input 
                                  type="checkbox" 
                                  checked={p.include} 
                                  onChange={e => updateParticipantInclude(identifier, e.target.checked)} 
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  disabled={isCreator}
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    {displayName} {isCreator && <span className="text-xs text-slate-500">(creator)</span>}
                                  </div>
                                  {member?.user.email && (
                                    <div className="text-xs text-slate-500">{member.email}</div>
                                  )}
                                </div>
                                {!txForm.splitEven && p.include && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      min="0"
                                      value={p.amount_owed} 
                                      onChange={e => updateParticipantAmount(identifier, e.target.value)} 
                                      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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

                      {/* Form Actions */}
                      <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 -mb-6 px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowCreate(false)}
                            className="min-w-[80px]"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            variant="primary"
                            disabled={creating}
                            className="min-w-[100px]"
                          >
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