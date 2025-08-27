import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "../components/AuthProvider";
import { 
  Plus, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  DollarSign
} from "lucide-react";

const api = {
  baseURL: 'http://localhost:3000/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
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

    transactions.forEach(transaction => {
      if (transaction.created_by === userId) {
        transaction.members?.forEach(member => {
          if (member.user_id !== userId && member.payment_status === 'pending') {
            owedTo += parseFloat(member.amount_owed || 0);
          }
        });
      }
      
      if (transaction.user_payment_status === 'pending' && transaction.is_user_participant) {
        owes += parseFloat(transaction.user_amount_owed || 0);
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
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
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

  if (authLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center px-4 font-sans">
        <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-8 max-w-md w-full">
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Please log in
            </h2>
            <p style={{ color: '#4b5563', marginBottom: '1rem' }}>
              You need to be logged in to view your dashboard.
            </p>
            <Link to="/login">
              <button
                style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
                onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
              >
                Go to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center px-4 font-sans">
        <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-8 max-w-md w-full">
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
              <Clock style={{ width: '3rem', height: '3rem', margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#4b5563', marginBottom: '1rem' }}>{error}</p>
            <button
              onClick={handleRetry}
              style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
              onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 font-sans">
      <div className="bg-white dark:bg-[#2e2e2e] shadow-md rounded-lg p-4 sm:p-8 max-w-7xl w-full">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome back, {currentUser.username || currentUser.name || currentUser.email || 'there'}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Here's your expense overview
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link to={createPageUrl("AddExpense")}>
                <button
                  style={{ display: 'flex', alignItems: 'center', background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                  onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                >
                  <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  Add Expense
                </button>
              </Link>
              <Link to={createPageUrl("Circles")}>
                <button
                  style={{ display: 'flex', alignItems: 'center', background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                  onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                >
                  <Users style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  Manage Circles
                </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-1">You're owed</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">${balances.owedTo || 0}</p>
              <ArrowDownLeft className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-1">You owe</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">${balances.owes || 0}</p>
              <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-1">Net balance</h3>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">${balances.net ?? (balances.owedTo - balances.owes)}</p>
              <DollarSign className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Recent Activity</h3>
              {transactions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center">No recent activity</p>
              ) : (
                <ul className="list-none p-0 space-y-2">
                  {transactions.map((transaction) => (
                    <li key={transaction.id} className="p-2 border-b border-gray-300 dark:border-gray-600">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description || 'Transaction'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-[#2e2e2e] border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-md">
              <div className="pb-3 mb-3 border-b border-gray-300 dark:border-gray-600">
                <h3 className="flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  <Users className="w-5 h-5 text-indigo-600 mr-2" />
                  My Circles
                </h3>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm">
                  {circles.length}
                </span>
              </div>
              <div>
                {circles.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No circles yet</p>
                    <Link to={createPageUrl("Circles")}>
                      <button
                        style={{ background: '#4c1d95', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', border: 'none', transition: 'background 0.2s' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#381e72')}
                        onMouseOut={e => (e.currentTarget.style.background = '#4c1d95')}
                      >
                        <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                        Create your first circle
                      </button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {circles.slice(0, 3).map((circle) => (
                      <div key={circle.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{circle.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {circle.members?.length || circle.member_count || 0} members
                          </p>
                        </div>
                        <Link to={createPageUrl(`Circles/${circle.id}`)}>
                          <button
                            style={{ color: '#2b6cb0', background: 'none', border: '1px solid #2b6cb0', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                            onMouseOver={e => (e.currentTarget.style.background = '#ebf8ff')}
                            onMouseOut={e => (e.currentTarget.style.background = 'none')}
                          >
                            View
                          </button>
                        </Link>
                      </div>
                    ))}
                    {circles.length > 3 && (
                      <Link to={createPageUrl("Circles")}>
                        <button
                          style={{ width: '100%', border: '1px solid #d1d5db', color: '#4b5563', padding: '0.5rem', borderRadius: '0.375rem', background: '#e5e7eb', fontWeight: '500', transition: 'background 0.2s' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#d1d5db')}
                          onMouseOut={e => (e.currentTarget.style.background = '#e5e7eb')}
                        >
                          View all circles ({circles.length})
                        </button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}