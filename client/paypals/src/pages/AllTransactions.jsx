import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import Notification from "../components/Notification";
import { useNotification } from "../hooks/useNotification";
import { 
  DollarSign, 
  Clock3,
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MapPin,
  Users,
  User,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowLeft
} from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-900 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-11 px-8"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div className={`bg-white border border-slate-200 rounded-lg ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-800"
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Select = ({ children, value, onChange, className = "" }) => (
  <select 
    value={value} 
    onChange={onChange}
    className={`block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 ${className}`}
  >
    {children}
  </select>
);

const Input = ({ className = "", ...props }) => (
  <input 
    className={`block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 ${className}`}
    {...props}
  />
);

const AllTransactions = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { notification, showNotification, hideNotification } = useNotification();
  
  const [allTransactions, setAllTransactions] = useState([]); // All transactions from API
  const [transactions, setTransactions] = useState([]); // Paginated transactions for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter and search states
  const [searchInput, setSearchInput] = useState(""); // What user types
  const [searchTerm, setSearchTerm] = useState(""); // Debounced search term for filtering
  const [isSearching, setIsSearching] = useState(false); // Search loading state
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filteredTransactionCount, setFilteredTransactionCount] = useState(0);
  const [transactionsPerPage] = useState(20);
  
  // Categories for filter dropdown
  const categories = [
    { value: "all", label: "All Categories" },
    { value: "food", label: "Food & Dining" },
    { value: "transport", label: "Transportation" },
    { value: "entertainment", label: "Entertainment" },
    { value: "utilities", label: "Utilities" },
    { value: "shopping", label: "Shopping" },
    { value: "other", label: "Other" }
  ];

  // Memoized filtered and sorted transactions for better performance
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.name?.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.location_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(transaction => {
        const userPaymentStatus = transaction.user_payment_status || 'pending';
        return userPaymentStatus === statusFilter;
      });
    }
    
    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(transaction =>
        transaction.category === categoryFilter
      );
    }
    
    // Sort transactions
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.total_amount || 0);
          bValue = parseFloat(b.total_amount || 0);
          break;
        case 'user_amount':
          aValue = parseFloat(a.user_amount_owed || 0);
          bValue = parseFloat(b.user_amount_owed || 0);
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return filtered;
  }, [allTransactions, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder]);

  // Memoized pagination
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * transactionsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);
  }, [filteredTransactions, currentPage, transactionsPerPage]);

  // API client matching Dashboard's approach
  const api = {
    baseURL: 'http://localhost:3000/api',
    
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      };
      try {
        const response = await fetch(url, config);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
      }
    },
    
    async getUserTransactions() {
      return this.request(`/transactions/user`);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const transactionResponse = await api.getUserTransactions();
      const fetchedTransactions = transactionResponse.data?.transactions || [];
      
      // Simply store all transactions - filtering is handled by useMemo
      setAllTransactions(fetchedTransactions);
      setTotalTransactions(fetchedTransactions.length);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
      
      // If authentication error, redirect to login
      if (error.message.includes('log in')) {
        showNotification('Please log in to view your transactions', 'error');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        showNotification(error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect - optimized delay
  useEffect(() => {
    if (searchInput !== searchTerm) {
      setIsSearching(true);
    }
    
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput.trim()); // Trim whitespace
      setCurrentPage(1); // Reset to first page when search term changes
      setIsSearching(false);
    }, 300); // Reduced to 300ms for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [searchInput, searchTerm]);

  // Only fetch when user changes or on mount - filtering is handled by useMemo
  useEffect(() => {
    if (currentUser) {
      fetchTransactions();
    } else {
      setLoading(false);
      showNotification('Please log in to view your transactions', 'error');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [currentUser]);

  // Update displayed transactions and counts when filtering changes
  useEffect(() => {
    setTransactions(paginatedTransactions);
    setFilteredTransactionCount(filteredTransactions.length);
  }, [paginatedTransactions, filteredTransactions.length]);

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
    // No need to reset page here - debounced effect will handle it
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'category') {
      setCategoryFilter(value);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const formatCurrency = (amount) => {
    return `$${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      food: 'bg-orange-100 text-orange-800',
      transport: 'bg-blue-100 text-blue-800',
      entertainment: 'bg-purple-100 text-purple-800',
      utilities: 'bg-green-100 text-green-800',
      shopping: 'bg-pink-100 text-pink-800',
      other: 'bg-slate-100 text-slate-800'
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center pt-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
          <div className="space-y-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">All Transactions</h1>
              <p className="text-slate-600">View and manage all your transactions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchInput}
                  onChange={handleSearch}
                  className="pl-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </Select>

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>

              {/* Sort Options */}
              <Select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-slate-900">{totalTransactions}</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {transactions.filter(t => t.user_payment_status === 'pending').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock3 className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {transactions.filter(t => t.user_payment_status === 'paid').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">You Owe</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      transactions
                        .filter(t => t.user_payment_status === 'pending')
                        .reduce((sum, t) => sum + (parseFloat(t.user_amount_owed) || 0), 0)
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions found</h3>
                <p className="text-slate-500 mb-4">
                  {searchInput || statusFilter !== 'all' || categoryFilter !== 'all' 
                    ? 'Try adjusting your filters or search terms.' 
                    : 'Start by creating your first transaction in a circle.'}
                </p>
                <Button onClick={() => navigate('/circles')}>
                  View Circles
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((transaction) => {
                  const isPaid = transaction.user_payment_status === 'paid';
                  const isCreator = transaction.created_by === currentUser?.user_id;
                  const userAmountOwed = parseFloat(transaction.user_amount_owed) || 0;
                  const totalAmount = parseFloat(transaction.total_amount) || 0;
                  
                  return (
                    <div key={transaction.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isPaid ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <DollarSign className={`w-6 h-6 ${
                              isPaid ? 'text-green-600' : 'text-slate-600'
                            }`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900 text-lg">
                                {transaction.name || 'Unnamed Transaction'}
                              </h3>
                              {isCreator && (
                                <Badge variant="blue" className="text-xs">Creator</Badge>
                              )}
                              <Badge 
                                variant={isPaid ? 'green' : 'red'} 
                                className="text-xs"
                              >
                                {isPaid ? 'Paid' : 'Pending'}
                              </Badge>
                              {transaction.category && (
                                <Badge className={`text-xs ${getCategoryColor(transaction.category)}`}>
                                  {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                                </Badge>
                              )}
                            </div>
                            
                            {transaction.description && (
                              <p className="text-slate-600 mb-2">{transaction.description}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(transaction.created_at)}
                              </div>
                              
                              {transaction.location_name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {transaction.location_name}
                                </div>
                              )}
                              
                              {transaction.members && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {transaction.members.length} participants
                                </div>
                              )}
                            </div>
                            
                            {transaction.circle && (
                              <div className="mt-2">
                                <Link 
                                  to={`/circles/${transaction.circle_id}`}
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {transaction.circle.name} →
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-900 mb-1">
                            {formatCurrency(totalAmount)}
                          </div>
                          {!isCreator && userAmountOwed > 0 && (
                            <div className="text-sm text-slate-600">
                              You owe: <span className="font-medium text-red-600">
                                {formatCurrency(userAmountOwed)}
                              </span>
                            </div>
                          )}
                          {transaction.payment_progress && (
                            <div className="text-xs text-slate-500 mt-1">
                              {transaction.payment_progress.paid_count}/{transaction.payment_progress.total_count} paid
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {((currentPage - 1) * transactionsPerPage) + 1} to{' '}
              {Math.min(currentPage * transactionsPerPage, filteredTransactionCount)} of {filteredTransactionCount} filtered transactions
              {filteredTransactionCount !== totalTransactions && (
                <span className="text-slate-500"> ({totalTransactions} total)</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllTransactions;
