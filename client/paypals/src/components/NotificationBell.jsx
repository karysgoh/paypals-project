import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, Users, DollarSign, UserPlus, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

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

  async getNotifications(unreadOnly = false) {
    const queryParam = unreadOnly ? '?unread_only=true' : '';
    return this.request(`/notifications${queryParam}`);
  },

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  },

  async markAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  async deleteNotification(notificationId) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

const NotificationIcon = ({ type }) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'payment_due':
      return <Clock {...iconProps} className="w-4 h-4 text-orange-500" />;
    case 'payment_received':
      return <DollarSign {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'circle_invitation':
      return <UserPlus {...iconProps} className="w-4 h-4 text-blue-500" />;
    case 'member_joined':
      return <Users {...iconProps} className="w-4 h-4 text-purple-500" />;
    case 'transaction_created':
      return <DollarSign {...iconProps} className="w-4 h-4 text-blue-500" />;
    default:
      return <Bell {...iconProps} className="w-4 h-4 text-slate-500" />;
  }
};

const NotificationItem = ({ notification, onMarkRead, onDelete }) => {
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const notificationTime = new Date(dateString);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationTime.toLocaleDateString();
  };

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    try {
      await onMarkRead(notification.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
      !notification.is_read ? 'bg-blue-50' : 'bg-white'
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <NotificationIcon type={notification.type} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${
              !notification.is_read ? 'text-slate-900' : 'text-slate-700'
            }`}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 ml-2">
              {!notification.is_read && (
                <button
                  onClick={handleMarkRead}
                  className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                title="Delete notification"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <p className={`text-sm mt-1 ${
            !notification.is_read ? 'text-slate-700' : 'text-slate-500'
          }`}>
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">
              {formatTimeAgo(notification.created_at)}
            </span>
            
            {/* Show related info if available */}
            {notification.related_transaction && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {notification.related_transaction.name}
              </span>
            )}
            {notification.related_circle && (
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                {notification.related_circle.name}
              </span>
            )}
          </div>
        </div>
        
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
        )}
      </div>
    </div>
  );
};

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load initial data and set up polling
  useEffect(() => {
    if (currentUser) {
      loadUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadUnreadCount = async () => {
    try {
      const response = await api.getUnreadCount();
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadNotifications = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.getNotifications();
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 rounded-full"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs text-slate-500">
                    ({unreadCount} unread)
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto"></div>
                <p className="text-sm text-slate-500 mt-2">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600 text-sm">
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}