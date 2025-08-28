import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "../components/AuthProvider";
import { 
  Plus, 
  Users, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Clock3,
  MoreHorizontal
} from "lucide-react";

const Button = ({ children, variant = "default", size = "default", className = "", onClick, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
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

const Badge = ({ children, variant = "default", className = "", ...props }) => {
  const variants = {
    default: "bg-slate-100 text-slate-700 border border-slate-200",
    green: "bg-green-50 text-green-700 border border-green-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-blue-50 text-blue-700 border border-blue-200"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

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

  async getUserCircles() {
    return this.request('/circle/user');
  },

  async getCircleById(id) {
    return this.request(`/circle/${id}`);
  },

  async getCircleTransactions(circleId) {
    return this.request(`/transaction/circle/${circleId}`);
  },
};

export default function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  const [circles, setCircles] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({ owedTo: 0, owes: 0, net: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateBalances = useCallback((transactions, userId) => {
    let owedTo = 0;
    let owes = 0;

    transactions.forEach((transaction) => {
      if (transaction.created_by === userId) {
        transaction.members?.forEach((member) => {
          if (member.user_id !== userId && member.payment_status === 'pending') {
            owedTo += parseFloat(member.amount_owed || '0');
          }
        });
      }
      
      if (transaction.user_payment_status === 'pending' && transaction.is_user_participant) {
        owes += parseFloat(transaction.user_amount_owed || '0');
      }
    });

    return { owedTo, owes, net: owedTo - owes };
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userCircles = await api.getUserCircles().catch(err => {
        console.warn('Failed to load circles:', err);
        return [];
      });
      setCircles(userCircles.data || []);

      let allTransactions = [];
      if (userCircles.data && userCircles.data.length > 0) {
        const transactionPromises = userCircles.data.map(circle =>
          api.getCircleTransactions(circle.id).catch(err => {
            console.warn(`Failed to load transactions for circle ${circle.id}:`, err);
            return { data: [] };
          })
        );
        const transactionResults = await Promise.all(transactionPromises);
        allTransactions = transactionResults
          .flatMap(result => result.data || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
      }
      setTransactions(allTransactions);
      const calculatedBalances = calculateBalances(allTransactions, currentUser.id);
      setBalances(calculatedBalances);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, calculateBalances]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadDashboardData();
    } else if (!authLoading && !currentUser) {
      setIsLoading(false);
    }
  }, [currentUser, authLoading, loadDashboardData]);

  const handleRetry = () => {
    loadDashboardData();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-slate-100 rounded"></div>
              <div className="h-24 bg-slate-100 rounded"></div>
              <div className="h-24 bg-slate-100 rounded"></div>
            </div>
            <div className="h-96 bg-slate-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    useNavigate('/'); 
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-sm w-full p-6">
          <div className="text-center space-y-4">
            <Clock3 className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-slate-900">Something went wrong</h2>
              <p className="text-slate-600 text-sm">{error}</p>
            </div>
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userName = currentUser.username || currentUser.name || currentUser.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-8 pt-12 pb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Good morning, {userName}
              </h1>
              <p className="text-slate-600 text-sm">
                Here's what's happening with your expenses
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={createPageUrl("expense")}>
                <Button variant="primary" size="md">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Expense
                </Button>
              </Link>
              <Link to={createPageUrl("circles")}>
                <Button variant="secondary" size="md">
                  <Users className="w-4 h-4 mr-1.5" />
                  Circles
                </Button>
              </Link>
            </div>
          </div>

          {/* Balance Overview */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <Badge variant="green">You're owed</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-slate-900">
                    ${(balances.owedTo || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">From friends</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  </div>
                  <Badge variant="red">You owe</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-slate-900">
                    ${(balances.owes || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">To friends</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <Badge variant="blue">Net balance</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-slate-900">
                    ${Math.abs(balances.net || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {balances.net >= 0 ? 'In your favor' : 'You owe overall'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="px-8 pb-12">
          <div className="grid grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="col-span-2">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-500">Your latest transactions</p>
              </div>

              <Card>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-1">No recent activity</p>
                      <p className="text-sm text-slate-500">Start by adding your first expense</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {transaction.description || transaction.name || 'Transaction'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              ${(transaction.total_amount || transaction.amount || 0).toFixed(2)}
                            </span>
                            <button className="p-1 hover:bg-slate-100 rounded">
                              <MoreHorizontal className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* My Circles */}
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-slate-900">My Circles</h2>
                    <p className="text-sm text-slate-500">{circles.length} active</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {circles.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-1">No circles yet</p>
                      <p className="text-sm text-slate-500 mb-4">Create your first circle to get started</p>
                      <Link to={createPageUrl("Circles")}>
                        <Button variant="primary" size="sm">
                          <Plus className="w-4 h-4 mr-1.5" />
                          Create Circle
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {circles.slice(0, 5).map((circle) => (
                        <div key={circle.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Users className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{circle.name}</p>
                              <p className="text-xs text-slate-500">
                                {circle.members?.length || circle.member_count || 0} members
                              </p>
                            </div>
                          </div>
                          <Link to={createPageUrl(`Circles/${circle.id}`)}>
                            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                              View
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {circles.length > 5 && (
                        <div className="p-4">
                          <Link to={createPageUrl("Circles")}>
                            <Button variant="outline" size="sm" className="w-full">
                              View all circles ({circles.length})
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}