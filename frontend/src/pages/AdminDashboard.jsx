import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, ClipboardList, CheckCircle, DollarSign, 
  Droplets, Users, MapPin, MessageSquare, LogOut, Menu, X,
  Clock, UserPlus, Key, FileText, Send, Route as RouteIcon,
  ChevronRight, Search, Filter, Eye, Edit, Trash2, Plus, Bell,
  Copy, ExternalLink, Phone, Mail, Navigation, Inbox, Building2,
  Home, Car, Sparkles, Warehouse, HardHat, Calendar as CalendarIcon,
  AlertCircle, ChevronLeft, AlertTriangle, Banknote, MessageCircle,
  Settings, Truck, UserCheck, PlusCircle, FileQuestion, Camera, Image
} from 'lucide-react';
import { toast } from 'sonner';
import DailyBibleVerse from '../components/shared/DailyBibleVerse';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CONTRACTOR_PORTAL_URL = `${window.location.origin}/contractor/login`;

// Notification sound
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Xj4F1cXV9iJSgn5aLfnJucX2IlZ6dloyAc29weoeSm5uUjYF2c3V8hpGZmZSNg3d0dXuFj5eXko2Bd3R2fIaQl5aRjIF3dHZ9hpCWlZCLgHZ0dn6Hj5WUj4qAdnR3foeOk5KNiYB2dHd+ho2SkIuIf3Z0d36GjJCOioZ+dnR4fYaLjo2IhX12dHh+hYqMi4aDfHZ0eH6EiYqJhIJ7dnV4foSIiYeEgXp2dXl+g4eHhoOAeXZ1eX6Ch4aFgn94dnV5fYKGhYOBfnd2dXl9gYSEgoB9d3V2eX2BhIOBf3x3dXZ5fYCDgYB+e3d1dnl9gIKAgH17d3V2enmAgIB/fHp3dXZ6eX9/f357eXd2dnp5fn5+fXx6eHd3d3p5fX19fHt5eHd3d3p5fHx8e3p5eHd4eHp5fHt7enl4eHh4eXl7e3t6eXl4eHh4eXp6enp5eXh4eHl5enp5eXl5eHh4eXl5eXl5eXl4eHh5eXl5eXl5eHh4eHl5eXl5eXh4eHh4eXl5eXl5eHh4eHh5eXl5eXl4eHh4eHh4eXl5eXl4eHh4eHh4eHl5eXh4eHh4eHh4eHh5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eA==";

// Service categories
const SERVICE_CATEGORIES = {
  recycling_bin: { name: 'Recycling Bin', icon: Trash2, color: 'bg-green-500' },
  scent_bomb: { name: 'Scent Bombs', icon: Droplets, color: 'bg-pink-500' },
  patio: { name: 'Patio', icon: Sparkles, color: 'bg-blue-500' },
  driveway: { name: 'Driveway', icon: Car, color: 'bg-orange-500' },
  dumpster: { name: 'Dumpster', icon: Warehouse, color: 'bg-purple-500' },
  home_powerwash: { name: 'Home Power Wash', icon: Home, color: 'bg-cyan-500' },
  construction_cleanup: { name: 'Construction', icon: HardHat, color: 'bg-amber-500' },
  commercial: { name: 'Commercial', icon: Building2, color: 'bg-indigo-500' }
};

// Auth helper
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Sidebar Navigation
const navItems = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard' },
  { path: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  { path: 'create-booking', icon: PlusCircle, label: 'Create Booking' },
  { path: 'clients', icon: UserCheck, label: 'Clients' },
  { path: 'pending', icon: Clock, label: 'Pending Services' },
  { path: 'completed', icon: CheckCircle, label: 'Completed Services' },
  { path: 'unpaid-subscriptions', icon: AlertCircle, label: 'Unpaid Subscriptions' },
  { path: 'revenue', icon: DollarSign, label: 'Revenue' },
  { path: 'subscriptions', icon: Users, label: 'Subscriptions' },
  { path: 'documents', icon: FileText, label: 'Documents' },
  { path: 'deleted-subscriptions', icon: Trash2, label: 'Deleted Subscriptions' },
  { path: 'contractors', icon: UserPlus, label: 'Contractors' },
  { path: 'payroll', icon: Banknote, label: 'Payroll' },
  { path: 'pending-routes', icon: RouteIcon, label: 'Pending Routes' },
  { path: 'released-routes', icon: AlertTriangle, label: 'Released Routes' },
  { path: 'route-requests', icon: ClipboardList, label: 'Route Requests' },
  { path: 'quotes', icon: FileQuestion, label: 'Quote Requests' },
  { path: 'sms-logs', icon: MessageCircle, label: 'SMS Logs' },
  { path: 'messages', icon: MessageSquare, label: 'Messages' },
  { path: 'inquiries', icon: Inbox, label: 'Inquiry Messages' },
  { path: 'settings', icon: Settings, label: 'Settings' },
];

// Trash2 icon for recycling
const Trash2Icon = Trash2;

// Dashboard Overview
function DashboardOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const copyContractorLink = () => {
    navigator.clipboard.writeText(CONTRACTOR_PORTAL_URL);
    toast.success('Contractor portal link copied!');
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'Total Bookings', value: stats?.total_bookings || 0, icon: ClipboardList, color: 'bg-blue-500', link: '/admin/dashboard/pending' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'bg-yellow-500', link: '/admin/dashboard/pending' },
    { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle, color: 'bg-green-500', link: '/admin/dashboard/completed' },
    { label: 'Revenue', value: `$${(stats?.total_revenue || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500', link: '/admin/dashboard/revenue' },
    { label: 'Scent Bomb Orders', value: stats?.scent_bomb_orders || 0, icon: Droplets, color: 'bg-purple-500', link: '/admin/dashboard/scent-bombs' },
    { label: 'Contractors', value: stats?.contractor_count || stats?.contractor_count || 0, icon: Users, color: 'bg-indigo-500', link: '/admin/dashboard/contractors' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
      
      {/* Daily Bible Verse */}
      <DailyBibleVerse />
      
      {/* Contractor Portal Link Card */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur rounded-2xl p-6 border border-indigo-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Contractor Portal Link</h3>
            <p className="text-white/60 text-sm mb-2">Share this link with new contractors</p>
            <code className="bg-black/30 px-3 py-1 rounded text-indigo-300 text-sm break-all">{CONTRACTOR_PORTAL_URL}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyContractorLink}
              className="px-4 py-2 bg-indigo-500 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-600"
              data-testid="copy-contractor-link"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <a
              href={CONTRACTOR_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/10 text-white rounded-xl flex items-center gap-2 hover:bg-white/20"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(stat.link)}
            className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 hover:scale-105 transition-all"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/60 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-white/40 text-xs mt-1">Click to view →</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Group bookings by service category
function groupByCategory(bookings) {
  const grouped = {};
  bookings.forEach(booking => {
    const services = booking.services || [];
    services.forEach(s => {
      const category = s.service_id || 'other';
      if (!grouped[category]) grouped[category] = [];
      if (!grouped[category].find(b => b.id === booking.id)) {
        grouped[category].push(booking);
      }
    });
  });
  return grouped;
}

// Bookings List Component with Categories
function BookingsList({ status, title }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [status]);

  const fetchBookings = async () => {
    try {
      const url = status ? `${API_URL}/api/admin/bookings?status=${status}` : `${API_URL}/api/admin/bookings`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bookingId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings/${bookingId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Status updated');
      fetchBookings();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <LoadingSpinner />;

  const grouped = groupByCategory(bookings);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      
      {bookings.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryBookings]) => {
            const catInfo = SERVICE_CATEGORIES[category] || { name: category, icon: ClipboardList, color: 'bg-gray-500' };
            const CatIcon = catInfo.icon;
            
            return (
              <div key={category} className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${catInfo.color} rounded-xl flex items-center justify-center`}>
                      <CatIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white">{catInfo.name}</h3>
                      <p className="text-white/60 text-sm">{categoryBookings.length} orders</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-white/60 transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedCategory === category && (
                  <div className="border-t border-white/10 p-4 space-y-3">
                    {categoryBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} onUpdateStatus={updateStatus} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Booking Card with Quote Management
function BookingCard({ booking, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  const [quoteData, setQuoteData] = useState({
    date: booking.booking_dates?.[0] || '',
    time: '09:00',
    price: booking.total || 0
  });

  const sendQuoteInvoice = async () => {
    if (!booking.customer_email) {
      toast.error('Customer email required to send invoice');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/admin/quotes/${booking.id}/send-invoice`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(quoteData)
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Quote invoice sent!');
      setEditingQuote(false);
    } catch (err) {
      toast.error('Failed to send invoice');
    }
  };

  return (
    <motion.div
      layout
      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
    >
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${
            booking.status === 'completed' ? 'bg-green-500' :
            booking.status === 'confirmed' ? 'bg-blue-500' :
            booking.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <div>
            <p className="text-white font-semibold">{booking.customer_name}</p>
            <p className="text-white/60 text-sm">{booking.customer_phone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold">${booking.total?.toFixed(2)}</p>
          <p className="text-white/60 text-sm">{booking.booking_dates?.[0]}</p>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4 border-t border-white/10"
        >
          <div className="pt-4 space-y-3">
            <p className="text-white/80"><strong>Address:</strong> {booking.customer_address}</p>
            <p className="text-white/80"><strong>Email:</strong> {booking.customer_email || 'N/A'}</p>
            <p className="text-white/80"><strong>Services:</strong> {booking.services?.map(s => s.service_id).join(', ')}</p>
            <p className="text-white/80"><strong>Status:</strong> {booking.status}</p>
            <p className="text-white/80"><strong>Payment:</strong> {booking.payment_status}</p>
            
            {/* Quote Editing for quote services */}
            {booking.is_quote_service && (
              <div className="bg-amber-500/20 rounded-xl p-4 mt-4">
                <h4 className="text-amber-300 font-semibold mb-3">Quote Management</h4>
                {editingQuote ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-white/60 text-xs">Date</label>
                        <input
                          type="date"
                          value={quoteData.date}
                          onChange={(e) => setQuoteData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-xs">Time</label>
                        <input
                          type="time"
                          value={quoteData.time}
                          onChange={(e) => setQuoteData(prev => ({ ...prev, time: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-xs">Price ($)</label>
                        <input
                          type="number"
                          value={quoteData.price}
                          onChange={(e) => setQuoteData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingQuote(false)}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendQuoteInvoice}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Send Invoice
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingQuote(true)}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Set Quote Details & Send Invoice
                  </button>
                )}
              </div>
            )}
            
            <div className="flex gap-2 pt-2 flex-wrap">
              {booking.status !== 'completed' && (
                <button
                  onClick={() => onUpdateStatus(booking.id, 'completed')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Mark Complete
                </button>
              )}
              {booking.status === 'pending' && (
                <button
                  onClick={() => onUpdateStatus(booking.id, 'confirmed')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Scent Bomb Orders
function ScentBombOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings?is_scent_bomb_only=true`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data.bookings || []);
    } catch (err) {
      toast.error('Failed to load scent bomb orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Droplets className="text-purple-400" />
        Scent Bomb Orders
      </h1>
      {orders.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No scent bomb orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <BookingCard key={order.id} booking={order} onUpdateStatus={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}

// Revenue Page with Categories
function RevenuePage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaidBookings();
  }, []);

  const fetchPaidBookings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const paid = (data.bookings || []).filter(b => b.payment_status === 'paid');
      setBookings(paid);
    } catch (err) {
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const grouped = groupByCategory(bookings);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <DollarSign className="text-green-400" />
        Revenue
      </h1>

      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur rounded-2xl p-8 border border-green-500/30">
        <p className="text-green-200 text-lg">Total Revenue</p>
        <p className="text-5xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
        <p className="text-green-200 mt-2">{bookings.length} paid bookings</p>
      </div>

      {/* Revenue by Category */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([category, categoryBookings]) => {
          const catInfo = SERVICE_CATEGORIES[category] || { name: category, icon: ClipboardList, color: 'bg-gray-500' };
          const CatIcon = catInfo.icon;
          const catRevenue = categoryBookings.reduce((sum, b) => sum + (b.total || 0), 0);
          
          return (
            <div key={category} className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 ${catInfo.color} rounded-lg flex items-center justify-center`}>
                  <CatIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold">{catInfo.name}</span>
              </div>
              <p className="text-2xl font-bold text-green-400">${catRevenue.toFixed(2)}</p>
              <p className="text-white/60 text-sm">{categoryBookings.length} orders</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Subscriptions Management (formerly Client Portal)
function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async () => {
    if (!editingSubscription) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${editingSubscription.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customer_name: editingSubscription.customer_name,
          customer_email: editingSubscription.customer_email,
          customer_phone: editingSubscription.customer_phone,
          customer_address: editingSubscription.customer_address,
          monthly_service_days: editingSubscription.monthly_service_days,
          service_days_per_month: editingSubscription.service_days_per_month
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Subscription updated!');
      setEditingSubscription(null);
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to update subscription');
    }
  };

  const deleteSubscription = async () => {
    if (!deleteModal || !deleteReason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${deleteModal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: deleteReason })
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Subscription deleted and archived');
      setDeleteModal(null);
      setDeleteReason('');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to delete subscription');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Users className="text-blue-400" />
        Subscriptions
      </h1>

      {subscriptions.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No active subscriptions</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {subscriptions.map((sub) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{sub.customer_name}</h3>
                  <p className="text-white/60">{sub.customer_phone}</p>
                  <p className="text-white/60">{sub.customer_email || 'No email'}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  sub.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' :
                  sub.subscription_status === 'payment_failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {sub.subscription_status || 'active'}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="text-white/80"><strong>Address:</strong> {sub.customer_address}</p>
                <p className="text-white/80"><strong>Days/Month:</strong> {sub.service_days_per_month || 2}</p>
                <p className="text-white/80"><strong>Service Days:</strong> {(sub.monthly_service_days || []).join(', ') || 'Not set'}</p>
                <p className="text-green-400 font-bold">${(sub.total || 0).toFixed(2)}/month</p>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedSubscription(sub)}
                  className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
                <button
                  onClick={() => setEditingSubscription({...sub})}
                  className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 flex items-center justify-center gap-1"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setDeleteModal(sub)}
                  className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Subscription Modal */}
      {selectedSubscription && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedSubscription(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedSubscription.customer_name}</h2>
                <p className="text-white/60">Subscription Details</p>
              </div>
              <button onClick={() => setSelectedSubscription(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Contact Info</h3>
                <p className="text-white/80"><Phone className="w-4 h-4 inline mr-2" />{selectedSubscription.customer_phone}</p>
                <p className="text-white/80"><Mail className="w-4 h-4 inline mr-2" />{selectedSubscription.customer_email || 'No email'}</p>
                <p className="text-white/80"><MapPin className="w-4 h-4 inline mr-2" />{selectedSubscription.customer_address}</p>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Subscription Schedule</h3>
                <p className="text-white/80">Days per month: {selectedSubscription.service_days_per_month || 2}</p>
                <p className="text-white/80">Service days: {(selectedSubscription.monthly_service_days || []).join(', ') || 'Not configured'}</p>
                <p className="text-white/80">Next payment: {selectedSubscription.next_payment_date || 'N/A'}</p>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Services</h3>
                {(selectedSubscription.services || []).map((s, i) => (
                  <p key={i} className="text-white/80">{s.service_id} x{s.quantity || 1}</p>
                ))}
              </div>
              
              <div className="bg-green-500/20 rounded-xl p-4">
                <h3 className="text-green-400 font-semibold mb-2">Billing</h3>
                <p className="text-white/80">Subtotal: ${(selectedSubscription.subtotal || 0).toFixed(2)}</p>
                <p className="text-white/80">Discount (5%): -${(selectedSubscription.discount || 0).toFixed(2)}</p>
                <p className="text-white/80">Tax (8.25%): ${(selectedSubscription.tax || 0).toFixed(2)}</p>
                <p className="text-green-400 font-bold text-xl">Total: ${(selectedSubscription.total || 0).toFixed(2)}/month</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setEditingSubscription(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Edit Subscription</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm">Customer Name</label>
                <input
                  type="text"
                  value={editingSubscription.customer_name || ''}
                  onChange={(e) => setEditingSubscription(prev => ({...prev, customer_name: e.target.value}))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm">Email</label>
                <input
                  type="email"
                  value={editingSubscription.customer_email || ''}
                  onChange={(e) => setEditingSubscription(prev => ({...prev, customer_email: e.target.value}))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm">Phone</label>
                <input
                  type="tel"
                  value={editingSubscription.customer_phone || ''}
                  onChange={(e) => setEditingSubscription(prev => ({...prev, customer_phone: e.target.value}))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm">Address</label>
                <input
                  type="text"
                  value={editingSubscription.customer_address || ''}
                  onChange={(e) => setEditingSubscription(prev => ({...prev, customer_address: e.target.value}))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm">Days per Month</label>
                <select
                  value={editingSubscription.service_days_per_month || 2}
                  onChange={(e) => setEditingSubscription(prev => ({...prev, service_days_per_month: parseInt(e.target.value)}))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingSubscription(null)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={updateSubscription}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => { setDeleteModal(null); setDeleteReason(''); }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delete Subscription</h2>
              <p className="text-white/60 mt-2">
                This will delete the subscription for <strong>{deleteModal.customer_name}</strong>. 
                A record will be kept in the deletion history.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="text-white/60 text-sm">Reason for deletion *</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deletion..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModal(null); setDeleteReason(''); }}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={deleteSubscription}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                Delete Subscription
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Deleted Subscriptions History
function DeletedSubscriptionsPage() {
  const [deletedSubs, setDeletedSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedSubscriptions();
  }, []);

  const fetchDeletedSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/deleted-subscriptions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDeletedSubs(data.deleted_subscriptions || []);
    } catch (err) {
      console.error('Failed to load deleted subscriptions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Trash2 className="text-red-400" />
        Deleted Subscriptions History
      </h1>

      {deletedSubs.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <Trash2 className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No deleted subscriptions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deletedSubs.map((record) => (
            <div key={record.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-red-500/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{record.subscription_data?.customer_name}</h3>
                  <p className="text-white/60">{record.subscription_data?.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 text-sm">Deleted {new Date(record.deleted_at).toLocaleDateString()}</p>
                  <p className="text-white/40 text-xs">by {record.deleted_by}</p>
                </div>
              </div>
              
              <div className="bg-red-500/10 rounded-xl p-4 mb-4">
                <p className="text-white/60 text-sm mb-1">Deletion Reason:</p>
                <p className="text-white">{record.deletion_reason}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60">Email</p>
                  <p className="text-white">{record.subscription_data?.customer_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-white/60">Monthly Total</p>
                  <p className="text-white">${(record.subscription_data?.total || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Released Routes Management
function ReleasedRoutesPage() {
  const [releasedRoutes, setReleasedRoutes] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [selectedContractor, setSelectedContractor] = useState('');
  const [dispatchMessage, setDispatchMessage] = useState('');

  useEffect(() => {
    fetchReleasedRoutes();
    fetchContractors();
  }, []);

  const fetchReleasedRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/released-routes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setReleasedRoutes(data.released_routes || []);
    } catch (err) {
      console.error('Failed to load released routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractors(data.contractors || []);
    } catch (err) {
      console.error('Failed to load contractors');
    }
  };

  const dispatchRoute = async () => {
    if (!dispatchModal || !selectedContractor) {
      toast.error('Please select a contractor');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/released-routes/${dispatchModal.id}/dispatch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractor_id: selectedContractor,
          message: dispatchMessage
        })
      });
      if (!res.ok) throw new Error('Failed to dispatch');
      toast.success('Route dispatched! Contractor notified.');
      setDispatchModal(null);
      setSelectedContractor('');
      setDispatchMessage('');
      fetchReleasedRoutes();
    } catch (err) {
      toast.error('Failed to dispatch route');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Navigation className="text-purple-400" />
        Released Routes
      </h1>
      
      <div className="bg-purple-500/20 rounded-xl p-4 text-purple-200 text-sm">
        <p><strong>Released routes</strong> are routes that contractors have released back to you. 
        You can dispatch them to other contractors. Contractors earn <strong>$10 per stop</strong>.</p>
      </div>

      {releasedRoutes.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <Navigation className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No released routes available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {releasedRoutes.map((route) => (
            <div key={route.id} className={`bg-white/10 backdrop-blur rounded-2xl p-6 border ${
              route.status === 'claimed' ? 'border-green-500/30' : 
              route.status === 'dispatched' ? 'border-yellow-500/30' : 'border-purple-500/30'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{route.route_name}</h3>
                  <p className="text-white/60">Area: {route.route_area || 'Not specified'}</p>
                  <p className="text-white/40 text-sm">
                    Released by {route.released_by_contractor_name} on {new Date(route.released_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  route.status === 'claimed' ? 'bg-green-500/20 text-green-400' :
                  route.status === 'dispatched' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {route.status}
                </div>
              </div>
              
              {route.release_reason && (
                <div className="bg-white/5 rounded-xl p-3 mb-4">
                  <p className="text-white/60 text-sm">Release Reason: {route.release_reason}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{route.num_stops}</p>
                  <p className="text-white/60 text-sm">Stops</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">${route.contractor_pay?.toFixed(2)}</p>
                  <p className="text-white/60 text-sm">Contractor Pay</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">$10</p>
                  <p className="text-white/60 text-sm">Per Stop</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">FREE</p>
                  <p className="text-white/60 text-sm">No Charge</p>
                </div>
              </div>
              
              {/* Booking Details */}
              {route.booking_details && route.booking_details.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-white font-semibold mb-2">Stops:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {route.booking_details.map((booking, i) => (
                      <div key={i} className="text-sm text-white/80 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span>{booking.customer_name} - {booking.customer_address}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {route.status === 'available' && (
                <button
                  onClick={() => setDispatchModal(route)}
                  className="w-full py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Dispatch to Contractor
                </button>
              )}
              
              {route.status === 'dispatched' && (
                <p className="text-yellow-400 text-sm text-center">
                  Dispatched - Waiting for contractor to claim
                </p>
              )}
              
              {route.status === 'claimed' && (
                <p className="text-green-400 text-sm text-center">
                  ✓ Route claimed by contractor
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setDispatchModal(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Dispatch Route</h2>
            <p className="text-white/60 mb-6">
              Send <strong>{dispatchModal.route_name}</strong> to a contractor
            </p>
            
            <div className="bg-purple-500/20 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{dispatchModal.num_stops}</p>
                  <p className="text-white/60 text-sm">Stops</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">${dispatchModal.contractor_pay?.toFixed(2)}</p>
                  <p className="text-white/60 text-sm">Contractor Earns</p>
                </div>
              </div>
              <p className="text-center text-purple-300 text-sm mt-2">
                Route is FREE - No charge to contractor
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm">Select Contractor *</label>
                <select
                  value={selectedContractor}
                  onChange={(e) => setSelectedContractor(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                >
                  <option value="">Choose a contractor...</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-white/60 text-sm">Message (optional)</label>
                <textarea
                  value={dispatchMessage}
                  onChange={(e) => setDispatchMessage(e.target.value)}
                  placeholder="Add a personal message..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setDispatchModal(null)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={dispatchRoute}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Offer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Route Requests Page - View and approve contractor route requests
function RouteRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRouteRequests();
  }, []);

  const fetchRouteRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/route-requests`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load route requests');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/route-requests/${requestId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to approve');
      toast.success('Route request approved!');
      fetchRouteRequests();
    } catch (err) {
      toast.error('Failed to approve request');
    }
  };

  const denyRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/route-requests/${requestId}/deny`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to deny');
      toast.success('Route request denied');
      fetchRouteRequests();
    } catch (err) {
      toast.error('Failed to deny request');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <ClipboardList className="text-yellow-400" />
        Route Requests
      </h1>
      
      <div className="bg-yellow-500/20 rounded-xl p-4 text-yellow-200 text-sm">
        <p>Contractors request routes by zip code. Approve requests to assign routes and charge <strong>$11 per stop</strong>.</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <ClipboardList className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No pending route requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-yellow-500/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{request.contractor_name}</h3>
                  <p className="text-white/60">Requested: {new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {request.status}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{request.zip_codes?.join(', ') || 'All'}</p>
                  <p className="text-white/60 text-sm">Zip Codes</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{request.num_routes_requested || 1}</p>
                  <p className="text-white/60 text-sm">Routes Requested</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">${((request.total_stops || 0) * 11).toFixed(2)}</p>
                  <p className="text-white/60 text-sm">Charge ($11/stop)</p>
                </div>
              </div>
              
              {request.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => denyRequest(request.id)}
                    className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => approveRequest(request.id)}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600"
                  >
                    Approve & Charge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Contractors Management with Enhanced Details
function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [contractorEarnings, setContractorEarnings] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [newContractor, setNewContractor] = useState({
    username: '', password: '', full_name: '', phone: '', email: ''
  });
  // SMS States
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsContractor, setSmsContractor] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsHistory, setSmsHistory] = useState([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendCredentials, setSendCredentials] = useState(false);
  // Edit Contractor States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  useEffect(() => {
    fetchContractors();
    fetchRoutes();
  }, []);

  const fetchContractors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractors(data.contractors || []);
    } catch (err) {
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/routes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (err) {
      console.error('Failed to load routes');
    }
  };

  const fetchContractorEarnings = async (contractorId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors/${contractorId}/earnings`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractorEarnings(data);
    } catch (err) {
      console.error('Failed to load earnings');
      setContractorEarnings(null);
    }
  };

  const payContractor = async () => {
    if (!selectedContractor || !payAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/contractors/${selectedContractor.id}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          payment_method: payMethod,
          notes: payNotes
        })
      });
      if (!res.ok) throw new Error('Failed to pay');
      toast.success(`Payment of $${payAmount} recorded!`);
      setShowPayModal(false);
      setPayAmount('');
      setPayNotes('');
      fetchContractorEarnings(selectedContractor.id);
    } catch (err) {
      toast.error('Failed to record payment');
    }
  };

  const openContractorDetails = async (contractor) => {
    setSelectedContractor(contractor);
    await fetchContractorEarnings(contractor.id);
  };

  const createContractor = async () => {
    if (!newContractor.username || !newContractor.password || !newContractor.full_name || !newContractor.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/contractors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newContractor)
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success('Contractor created!');
      setShowCreateModal(false);
      setNewContractor({ username: '', password: '', full_name: '', phone: '', email: '' });
      fetchContractors();
    } catch (err) {
      toast.error('Failed to create contractor');
    }
  };

  const resetPassword = async (contractorId) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/contractors/${contractorId}/password?new_password=${encodeURIComponent(newPassword)}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to reset');
      toast.success('Password updated!');
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  const sendSMS = async (contractor) => {
    setSmsContractor(contractor);
    setShowSMSModal(true);
    setSmsMessage('');
    setSendCredentials(false);
    // Fetch SMS history
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractor/history/${contractor.id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSmsHistory(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load SMS history');
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setSendingSMS(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractor`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractor_id: smsContractor.id,
          message: smsMessage
        })
      });
      const data = await res.json();
      if (data.status === 'sent') {
        toast.success(`SMS sent to ${smsContractor.full_name}!`);
      } else if (data.status === 'failed') {
        toast.error('SMS failed - check phone number');
      } else {
        toast.info(`SMS logged (${data.status})`);
      }
      setSmsMessage('');
      // Refresh history
      const histRes = await fetch(`${API_URL}/api/admin/sms/contractor/history/${smsContractor.id}`, { headers: getAuthHeaders() });
      if (histRes.ok) {
        const histData = await histRes.json();
        setSmsHistory(histData.messages || []);
      }
    } catch (err) {
      toast.error('Failed to send SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  const handleSendLoginCredentials = async () => {
    setSendingSMS(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractor/login`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractor_id: smsContractor.id,
          include_password: true
        })
      });
      const data = await res.json();
      if (data.status === 'sent') {
        toast.success(`Login credentials sent to ${data.contractor_name}!`);
      } else if (data.status === 'failed') {
        toast.error('SMS failed - check phone number');
      } else {
        toast.info(`Credentials logged (${data.status})`);
      }
      setShowSMSModal(false);
    } catch (err) {
      toast.error('Failed to send login credentials');
    } finally {
      setSendingSMS(false);
    }
  };

  const sendNotification = async (contractor) => {
    const title = prompt('Notification Title:');
    if (!title) return;
    const message = prompt('Notification Message:');
    if (!message) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractor_id: contractor.id,
          title: title,
          message: message
        })
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success(`Notification sent to ${contractor.full_name}!`);
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const broadcastNotification = async () => {
    const title = prompt('Broadcast Title:');
    if (!title) return;
    const message = prompt('Broadcast Message:');
    if (!message) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications/broadcast?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Notification sent to all contractors!');
    } catch (err) {
      toast.error('Failed to broadcast notification');
    }
  };

  const openEditContractor = (contractor) => {
    setEditingContractor({...contractor});
    setShowEditModal(true);
  };

  const saveContractorEdit = async () => {
    if (!editingContractor) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors/${editingContractor.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          full_name: editingContractor.full_name,
          email: editingContractor.email,
          phone: editingContractor.phone,
          address: editingContractor.address,
          pay_rate: editingContractor.pay_rate,
          is_active: editingContractor.is_active,
          notes: editingContractor.notes
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Contractor information updated!');
      setShowEditModal(false);
      fetchContractors();
    } catch (err) {
      toast.error('Failed to update contractor');
    }
  };

  const deleteContractor = async (contractorId) => {
    if (!window.confirm('Are you sure you want to delete this contractor?')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/contractors/${contractorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Contractor deleted');
      fetchContractors();
    } catch (err) {
      toast.error('Failed to delete contractor');
    }
  };

  const getContractorRoutes = (contractorId) => {
    return routes.filter(r => r.assigned_contractor_id === contractorId);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <UserPlus className="text-indigo-400" />
          Contractors
        </h1>
        <div className="flex gap-2">
          <button
            onClick={broadcastNotification}
            className="px-4 py-2 bg-yellow-500 text-white rounded-xl flex items-center gap-2 hover:bg-yellow-600"
          >
            <Bell className="w-5 h-5" />
            Broadcast to All
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-600"
            data-testid="create-contractor-btn"
          >
            <Plus className="w-5 h-5" />
            Add Contractor
          </button>
        </div>
      </div>

      {/* Contractor Portal Link */}
      <div className="bg-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-indigo-200 text-sm">Share this link with new contractors:</p>
          <code className="text-indigo-300">{CONTRACTOR_PORTAL_URL}</code>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(CONTRACTOR_PORTAL_URL); toast.success('Link copied!'); }}
          className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-sm"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No contractors yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contractors.map((contractor) => {
            const contractorRoutes = getContractorRoutes(contractor.id);
            
            return (
              <div key={contractor.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{contractor.full_name}</h3>
                    <p className="text-white/60">@{contractor.username}</p>
                    <p className="text-white/60">{contractor.phone}</p>
                    <p className="text-white/60">{contractor.email || 'No email'}</p>
                    
                    {/* Routes assigned */}
                    <div className="mt-4">
                      <p className="text-white/60 text-sm mb-2">Assigned Routes:</p>
                      {contractorRoutes.length === 0 ? (
                        <p className="text-yellow-400 text-sm">No routes assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {contractorRoutes.map(route => (
                            <span key={route.id} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                              {route.name} ({route.bookings?.length || 0} stops)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openContractorDetails(contractor)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                      title="View Details & Earnings"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditContractor(contractor)}
                      className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30"
                      title="Edit Contractor"
                      data-testid={`edit-contractor-${contractor.id}`}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => sendNotification(contractor)}
                      className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30"
                      title="Send Notification"
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => sendSMS(contractor)}
                      className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                      title="Send SMS"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => resetPassword(contractor.id)}
                      className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30"
                      title="Reset Password"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteContractor(contractor.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contractor Detail Modal with Earnings */}
      {selectedContractor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => { setSelectedContractor(null); setContractorEarnings(null); }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedContractor.full_name}</h2>
                <p className="text-white/60">@{selectedContractor.username}</p>
              </div>
              <button onClick={() => { setSelectedContractor(null); setContractorEarnings(null); }} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Contact Information</h3>
                <p className="text-white/80"><Phone className="w-4 h-4 inline mr-2" />{selectedContractor.phone}</p>
                <p className="text-white/80"><Mail className="w-4 h-4 inline mr-2" />{selectedContractor.email || 'No email'}</p>
              </div>

              {/* Earnings Summary */}
              {contractorEarnings && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
                  <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Earnings Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-white/60 text-sm">This Week</p>
                      <p className="text-2xl font-bold text-green-400">${(contractorEarnings.this_week_earnings || 0).toFixed(2)}</p>
                      <p className="text-white/40 text-xs">{contractorEarnings.this_week_stops || 0} stops</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Earnings</p>
                      <p className="text-2xl font-bold text-white">${(contractorEarnings.total_earnings || 0).toFixed(2)}</p>
                      <p className="text-white/40 text-xs">{contractorEarnings.total_completed_stops || 0} stops</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Paid</p>
                      <p className="text-2xl font-bold text-blue-400">${(contractorEarnings.total_paid || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Owed</p>
                      <p className={`text-2xl font-bold ${(contractorEarnings.unpaid_balance || 0) > 0 ? 'text-yellow-400' : 'text-white/60'}`}>
                        ${(contractorEarnings.unpaid_balance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* CNS Stops */}
                  {contractorEarnings.total_cns_stops > 0 && (
                    <div className="mt-4 bg-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        <strong>{contractorEarnings.total_cns_stops}</strong> CNS stops (Cannot Service - no pay)
                      </p>
                    </div>
                  )}

                  {/* Pay Button */}
                  {(contractorEarnings.unpaid_balance || 0) > 0 && (
                    <button
                      onClick={() => { setPayAmount(contractorEarnings.unpaid_balance.toFixed(2)); setShowPayModal(true); }}
                      className="mt-4 w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Pay ${(contractorEarnings.unpaid_balance || 0).toFixed(2)} Now
                    </button>
                  )}
                </div>
              )}

              {/* Routes */}
              <div className="bg-white/10 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-3">Assigned Routes</h3>
                {getContractorRoutes(selectedContractor.id).length === 0 ? (
                  <p className="text-white/60">No routes assigned</p>
                ) : (
                  <div className="space-y-2">
                    {getContractorRoutes(selectedContractor.id).map(route => (
                      <div key={route.id} className="bg-white/5 rounded-lg p-3">
                        <p className="text-white font-semibold">{route.name}</p>
                        <p className="text-white/60 text-sm">{route.area}</p>
                        <p className="text-green-400 text-sm">{route.bookings?.length || 0} stops × $13 = ${((route.bookings?.length || 0) * 11).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History */}
              {contractorEarnings?.payment_history?.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3">Payment History</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {contractorEarnings.payment_history.map((payment, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                        <div>
                          <p className="text-white">${payment.amount.toFixed(2)}</p>
                          <p className="text-white/40 text-xs">{payment.payment_method}</p>
                        </div>
                        <p className="text-white/60 text-sm">{new Date(payment.paid_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => sendSMS(selectedContractor)}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Send SMS
                </button>
                <button
                  onClick={() => resetPassword(selectedContractor.id)}
                  className="flex-1 py-3 bg-yellow-500 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Key className="w-5 h-5" />
                  Reset Password
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pay Contractor Modal */}
      {showPayModal && selectedContractor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]" onClick={() => setShowPayModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Pay {selectedContractor.full_name}</h2>
            <p className="text-white/60 mb-6">Record payment to contractor</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-2xl font-bold"
                />
              </div>
              
              <div>
                <label className="text-white/60 text-sm">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="zelle">Zelle</option>
                  <option value="venmo">Venmo</option>
                </select>
              </div>
              
              <div>
                <label className="text-white/60 text-sm">Notes (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g., Week of Feb 27"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={payContractor}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Contractor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Create Contractor Account</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username *"
                value={newContractor.username}
                onChange={(e) => setNewContractor(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                data-testid="contractor-username"
              />
              <input
                type="password"
                placeholder="Password *"
                value={newContractor.password}
                onChange={(e) => setNewContractor(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                data-testid="contractor-password"
              />
              <input
                type="text"
                placeholder="Full Name *"
                value={newContractor.full_name}
                onChange={(e) => setNewContractor(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                data-testid="contractor-fullname"
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={newContractor.phone}
                onChange={(e) => setNewContractor(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                data-testid="contractor-phone"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newContractor.email}
                onChange={(e) => setNewContractor(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={createContractor}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600"
                  data-testid="save-contractor-btn"
                >
                  Create Account
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* SMS Modal */}
      {showSMSModal && smsContractor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]" onClick={() => setShowSMSModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  SMS to {smsContractor.full_name}
                </h2>
                <p className="text-white/60 text-sm">{smsContractor.phone}</p>
              </div>
              <button onClick={() => setShowSMSModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SMS History */}
            <div className="flex-1 bg-white/5 rounded-xl p-3 mb-4 overflow-y-auto min-h-[200px] max-h-[300px]">
              {smsHistory.length === 0 ? (
                <p className="text-white/40 text-center py-8">No messages yet</p>
              ) : (
                <div className="space-y-3">
                  {[...smsHistory].reverse().map((msg, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg ${msg.sender_type === 'admin' ? 'bg-green-500/20 ml-8' : 'bg-blue-500/20 mr-8'}`}
                    >
                      <p className="text-white text-sm">{msg.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-xs ${msg.status === 'sent' ? 'text-green-400' : msg.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {msg.status}
                        </span>
                        <span className="text-white/40 text-xs">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSendLoginCredentials}
                disabled={sendingSMS}
                className="flex-1 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 flex items-center justify-center gap-2"
                data-testid="send-login-credentials-btn"
              >
                <Key className="w-4 h-4" />
                Send Login Credentials
              </button>
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 resize-none"
                rows={2}
                data-testid="sms-message-input"
              />
              <button
                onClick={handleSendSMS}
                disabled={sendingSMS || !smsMessage.trim()}
                className="px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                data-testid="send-sms-btn"
              >
                {sendingSMS ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Contractor Modal */}
      {showEditModal && editingContractor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70]" onClick={() => setShowEditModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                Edit Contractor
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingContractor.full_name || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, full_name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={editingContractor.email || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Phone</label>
                <input
                  type="tel"
                  value={editingContractor.phone || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Address</label>
                <input
                  type="text"
                  value={editingContractor.address || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, address: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Pay Rate (per stop)</label>
                <input
                  type="number"
                  value={editingContractor.pay_rate || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, pay_rate: parseFloat(e.target.value)})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Notes</label>
                <textarea
                  value={editingContractor.notes || ''}
                  onChange={(e) => setEditingContractor({...editingContractor, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white h-20"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={editingContractor.is_active !== false}
                  onChange={(e) => setEditingContractor({...editingContractor, is_active: e.target.checked})}
                  className="w-5 h-5"
                />
                <label className="text-white">Active</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={saveContractorEdit}
                  className="flex-1 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600"
                  data-testid="save-contractor-edit-btn"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Routes Management
function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [newRoute, setNewRoute] = useState({ name: '', description: '', area: '', price: 350 });
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('zip'); // 'zip', 'city', 'state'

  useEffect(() => {
    fetchRoutes();
    fetchContractors();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/routes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Filter out assigned routes (only show pending/unassigned)
      const pendingRoutes = (data.routes || []).filter(r => 
        !r.assigned_contractor_id && r.status !== 'assigned'
      );
      setRoutes(pendingRoutes);
    } catch (err) {
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractors(data.contractors || []);
    } catch (err) {
      console.error('Failed to load contractors');
    }
  };

  const createRoute = async () => {
    if (!newRoute.name) {
      toast.error('Please enter a route name');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/routes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRoute)
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success('Route created!');
      setShowCreateModal(false);
      setNewRoute({ name: '', description: '', area: '', price: 350 });
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to create route');
    }
  };

  const assignRoute = async (routeId, contractorId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/routes/${routeId}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ route_id: routeId, contractor_id: contractorId })
      });
      if (!res.ok) throw new Error('Failed to assign');
      toast.success('Route assigned and moved from pending!');
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to assign route');
    }
  };

  const deleteRoute = async (routeId) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/routes/${routeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Route deleted!');
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to delete route');
    }
  };

  const bulkDeleteRoutes = async () => {
    if (selectedRoutes.length === 0) {
      toast.error('Select routes to delete');
      return;
    }
    if (!window.confirm(`Delete ${selectedRoutes.length} selected routes?`)) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/routes/bulk-delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedRoutes })
      });
      if (!res.ok) throw new Error('Failed to delete');
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} routes`);
      setSelectedRoutes([]);
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to delete routes');
    } finally {
      setDeleting(false);
    }
  };

  const deleteOldRoutes = async () => {
    if (!window.confirm('Delete all pending routes older than 30 days?')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/routes/old?days=30`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete');
      const data = await res.json();
      toast.success(data.message);
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to delete old routes');
    } finally {
      setDeleting(false);
    }
  };

  const toggleRouteSelection = (routeId) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const combineRoutes = async () => {
    if (selectedRoutes.length < 2) {
      toast.error('Select at least 2 routes to combine');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/routes/combine`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ route_ids: selectedRoutes })
      });
      if (!res.ok) throw new Error('Failed to combine');
      toast.success('Routes combined successfully!');
      setShowCombineModal(false);
      setSelectedRoutes([]);
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to combine routes');
    }
  };

  const optimizeRoute = async (routeId, e) => {
    e.stopPropagation();
    
    const optimizeToast = toast.loading('Optimizing route with Google Maps...');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/routes/${routeId}/optimize`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.optimized) {
        toast.success(
          `Route optimized! ${data.total_stops} stops, ${data.total_distance_miles} miles, ~${data.total_duration_minutes} min drive time`,
          { id: optimizeToast, duration: 5000 }
        );
        fetchRoutes();
      } else {
        toast.error(data.message || 'Could not optimize route', { id: optimizeToast });
      }
    } catch (err) {
      toast.error('Failed to optimize route', { id: optimizeToast });
    }
  };

  // Filter routes by search query
  const filteredRoutes = routes.filter(route => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const routeName = (route.name || '').toLowerCase();
    const routeArea = (route.area || '').toLowerCase();
    const routeZip = (route.zip_code || '').toLowerCase();
    const bookings = route.bookings || [];
    
    // Search in route name, area, zip
    if (routeName.includes(query) || routeArea.includes(query) || routeZip.includes(query)) {
      return true;
    }
    
    // Search in booking customer names and addresses
    return bookings.some(b => 
      (b.customer_name || '').toLowerCase().includes(query) ||
      (b.customer_address || '').toLowerCase().includes(query) ||
      (b.customer_city || '').toLowerCase().includes(query)
    );
  });

  // Get unique grouping key for a route based on groupBy selection
  const getGroupKey = (route) => {
    if (groupBy === 'zip') return route.zip_code || 'Unassigned';
    if (groupBy === 'city') {
      const booking = route.bookings?.[0];
      return booking?.customer_city || route.area || 'Unknown City';
    }
    if (groupBy === 'state') {
      const booking = route.bookings?.[0];
      return booking?.customer_state || 'TX';
    }
    return 'All';
  };

  // Group routes dynamically based on groupBy
  const groupedRoutes = filteredRoutes.reduce((acc, route) => {
    const key = getGroupKey(route);
    if (!acc[key]) acc[key] = [];
    acc[key].push(route);
    return acc;
  }, {});

  // Filter only pending (unassigned) routes
  const pendingRoutes = routes.filter(r => !r.assigned_contractor_id);
  const assignedRoutes = routes.filter(r => r.assigned_contractor_id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <RouteIcon className="text-orange-400" />
          Pending Routes
          {routes.length > 0 && (
            <span className="bg-orange-500 text-white text-sm px-3 py-1 rounded-full">
              {routes.length} pending
            </span>
          )}
        </h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={deleteOldRoutes}
            disabled={deleting}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl flex items-center gap-2 hover:bg-red-500/30"
            data-testid="delete-old-routes-btn"
          >
            <Trash2 className="w-5 h-5" />
            Delete 30+ Days Old
          </button>
          {selectedRoutes.length > 0 && (
            <button
              onClick={bulkDeleteRoutes}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600"
              data-testid="bulk-delete-routes-btn"
            >
              <Trash2 className="w-5 h-5" />
              Delete Selected ({selectedRoutes.length})
            </button>
          )}
          {selectedRoutes.length >= 2 && (
            <button
              onClick={() => setShowCombineModal(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl flex items-center gap-2 hover:bg-purple-600"
            >
              <Navigation className="w-5 h-5" />
              Combine Selected ({selectedRoutes.length})
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl flex items-center gap-2 hover:bg-orange-600"
            data-testid="create-route-btn"
          >
            <Plus className="w-5 h-5" />
            Add Route
          </button>
        </div>
      </div>

      {/* Route Statistics Summary */}
      {routes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-white/60 text-sm">Total Routes</p>
            <p className="text-2xl font-bold text-white">{routes.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-white/60 text-sm">Total Stops</p>
            <p className="text-2xl font-bold text-blue-400">
              {routes.reduce((sum, r) => sum + (r.bookings?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-white/60 text-sm">Est. Contractor Pay</p>
            <p className="text-2xl font-bold text-green-400">
              ${(routes.reduce((sum, r) => sum + (r.bookings?.length || 0), 0) * 11).toFixed(0)}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-white/60 text-sm">Zip Codes</p>
            <p className="text-2xl font-bold text-purple-400">
              {new Set(routes.map(r => r.zip_code).filter(Boolean)).size}
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-blue-200 text-sm">
        <p>📍 Routes are automatically grouped by <strong>zip code</strong> (max 120 bookings per route).</p>
        <p className="mt-1">💰 Contractor pay: <strong>$11 per stop</strong> | Select routes to combine or delete them.</p>
        <p className="mt-1">✅ Once assigned, routes automatically move out of this list.</p>
      </div>

      {/* Search and Group Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search routes, addresses, customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            data-testid="route-search-input"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">Group by:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white [&>option]:text-black"
            data-testid="route-group-select"
          >
            <option value="zip">Zip Code</option>
            <option value="city">City</option>
            <option value="state">State</option>
          </select>
        </div>
        {searchQuery && (
          <span className="text-white/60 text-sm">
            Found {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {filteredRoutes.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <RouteIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">{searchQuery ? 'No routes match your search' : 'No pending routes'}</p>
          <p className="text-white/40 text-sm mt-2">
            {searchQuery ? 'Try a different search term' : 'Routes are created automatically when customers pay for routable services'}
          </p>
        </div>
      ) : (
        <>
          {/* Grouped Routes Display */}
          {Object.entries(groupedRoutes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupKey, groupRoutes]) => {
              const pendingInGroup = groupRoutes.filter(r => !r.assigned_contractor_id);
              if (pendingInGroup.length === 0) return null;
              
              const groupLabel = groupBy === 'zip' ? 'Zip Code' : groupBy === 'city' ? 'City' : 'State';
              
              return (
                <div key={groupKey} className="space-y-3">
                  <h2 className="text-lg font-bold text-white/80 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    {groupLabel}: {groupKey}
                    <span className="text-white/40 text-sm">({pendingInGroup.length} routes)</span>
                  </h2>
                  
                  <div className="space-y-3">
                    {pendingInGroup.map((route) => (
                      <div 
                        key={route.id} 
                        className={`bg-white/10 backdrop-blur rounded-2xl p-6 border transition cursor-pointer ${
                          selectedRoutes.includes(route.id) 
                            ? 'border-purple-500 bg-purple-500/20' 
                            : 'border-white/20 hover:border-white/40'
                        }`}
                        onClick={() => toggleRouteSelection(route.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              checked={selectedRoutes.includes(route.id)}
                              onChange={() => toggleRouteSelection(route.id)}
                              className="w-5 h-5 mt-1 rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <h3 className="text-xl font-bold text-white">{route.name}</h3>
                              <p className="text-white/60">{route.description || 'Auto-generated route'}</p>
                              <p className="text-white/60">Area: {route.area || route.zip_code || 'Not specified'}</p>
                              <div className="flex gap-4 mt-2 flex-wrap">
                                <p className="text-blue-400 text-sm">
                                  {route.bookings?.length || 0} / 120 stops
                                </p>
                                <p className="text-green-400 text-sm font-bold">
                                  ${((route.bookings?.length || 0) * 11).toFixed(2)} contractor pay
                                </p>
                                {route.optimized && (
                                  <p className="text-purple-400 text-sm">
                                    ✓ Optimized ({route.estimated_distance_miles} mi, ~{route.estimated_duration_minutes} min)
                                  </p>
                                )}
                              </div>
                              {(route.bookings?.length || 0) >= 2 && (
                                <button
                                  onClick={(e) => optimizeRoute(route.id, e)}
                                  className="mt-3 px-4 py-2 bg-purple-500/50 text-white rounded-xl hover:bg-purple-500/70 text-sm flex items-center gap-2"
                                >
                                  <Navigation className="w-4 h-4" />
                                  {route.optimized ? 'Re-Optimize Route' : 'Optimize Route Order'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <p className="text-white/60 text-sm mb-2">Assign to:</p>
                              <select
                                value={route.assigned_contractor_id || ''}
                                onChange={(e) => assignRoute(route.id, e.target.value)}
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white [&>option]:text-black"
                              >
                                <option value="">Unassigned</option>
                                {contractors.map(c => (
                                  <option key={c.id} value={c.id}>{c.full_name}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => deleteRoute(route.id)}
                              className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 text-sm flex items-center gap-1"
                              data-testid={`delete-route-${route.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </>
      )}

      {/* Assigned Routes Section */}
      {assignedRoutes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white/80 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Assigned Routes ({assignedRoutes.length})
          </h2>
          <div className="space-y-3">
            {assignedRoutes.map((route) => {
              const contractor = contractors.find(c => c.id === route.assigned_contractor_id);
              return (
                <div key={route.id} className="bg-green-500/10 backdrop-blur rounded-2xl p-4 border border-green-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">{route.name}</h3>
                      <p className="text-green-400 text-sm">
                        Assigned to: {contractor?.full_name || 'Unknown'} | {route.bookings?.length || 0} stops
                      </p>
                    </div>
                    <select
                      value={route.assigned_contractor_id || ''}
                      onChange={(e) => assignRoute(route.id, e.target.value)}
                      className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    >
                      <option value="">Unassign</option>
                      {contractors.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Create New Route</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Route Name *"
                value={newRoute.name}
                onChange={(e) => setNewRoute(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              />
              <input
                type="text"
                placeholder="Description"
                value={newRoute.description}
                onChange={(e) => setNewRoute(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              />
              <input
                type="text"
                placeholder="Area (e.g., Burleson North)"
                value={newRoute.area}
                onChange={(e) => setNewRoute(prev => ({ ...prev, area: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoute}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
                >
                  Create Route
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


// Admin Settings Page
function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payPerStop, setPayPerStop] = useState('');
  const [smallTruckPrice, setSmallTruckPrice] = useState('');
  const [largeTruckPrice, setLargeTruckPrice] = useState('');
  const [salesTax, setSalesTax] = useState('');
  const [services, setServices] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSettings(data);
      setPayPerStop(data.pay_per_stop?.toString() || '11');
      setSmallTruckPrice(data.truck_rental_prices?.small?.toString() || '75');
      setLargeTruckPrice(data.truck_rental_prices?.large?.toString() || '125');
      setSalesTax(((data.sales_tax || 0.0825) * 100).toFixed(2));
      setServices(data.services || {});
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const savePayPerStop = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/pay-per-stop`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pay_per_stop: parseFloat(payPerStop) })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Pay per stop updated!');
      fetchSettings();
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const saveTruckPrices = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/truck-rentals`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          small: parseFloat(smallTruckPrice),
          large: parseFloat(largeTruckPrice)
        })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Truck rental prices updated!');
      fetchSettings();
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const saveSalesTax = async () => {
    setSaving(true);
    try {
      const taxRate = parseFloat(salesTax) / 100; // Convert percentage to decimal
      if (taxRate < 0 || taxRate > 1) {
        toast.error('Sales tax must be between 0% and 100%');
        setSaving(false);
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/settings/sales-tax`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sales_tax: taxRate })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Sales tax updated!');
      fetchSettings();
    } catch (err) {
      toast.error('Failed to update sales tax');
    } finally {
      setSaving(false);
    }
  };

  const saveService = async (serviceId) => {
    if (!editingService) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/settings/service/${serviceId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          service_id: serviceId,
          name: editingService.name,
          price: parseFloat(editingService.price),
          is_routable: editingService.is_routable || false,
          is_quote: editingService.is_quote || false
        })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Service "${editingService.name}" updated!`);
      setEditingService(null);
      fetchSettings();
    } catch (err) {
      toast.error('Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Settings className="text-purple-400" />
        Admin Settings
      </h1>

      {/* Sales Tax Settings */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="text-yellow-400" />
          Sales Tax Rate
        </h2>
        <p className="text-white/60 mb-4">Set the sales tax rate applied at checkout (shown only at checkout).</p>
        
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label className="text-white/60 text-sm mb-1 block">Sales Tax (%)</label>
            <div className="flex items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={salesTax}
                onChange={(e) => setSalesTax(e.target.value)}
                className="w-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-xl font-bold"
                data-testid="sales-tax-input"
              />
              <span className="text-white text-2xl ml-2">%</span>
            </div>
          </div>
          <button
            onClick={saveSalesTax}
            disabled={saving}
            className="px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 disabled:opacity-50 font-bold"
            data-testid="save-sales-tax-btn"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-yellow-500/20 rounded-xl">
          <p className="text-yellow-300 text-sm">
            <strong>Current Rate:</strong> {((settings?.sales_tax || 0.0825) * 100).toFixed(2)}%<br/>
            <strong>Default Rate:</strong> 8.25% (Texas state tax)
          </p>
        </div>
      </div>

      {/* Service Prices */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="text-blue-400" />
          Service Prices
        </h2>
        <p className="text-white/60 mb-4">Manage prices for each service offered.</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(services).map(([serviceId, service]) => (
            <div key={serviceId} className="bg-white/5 rounded-xl p-4 border border-white/10">
              {editingService?.id === serviceId ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingService.name}
                    onChange={(e) => setEditingService(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="Service Name"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-white">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingService.price}
                      onChange={(e) => setEditingService(prev => ({ ...prev, price: e.target.value }))}
                      className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Price"
                    />
                    {service.is_quote && <span className="text-yellow-400 text-xs">(Quote-based)</span>}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-white/60 text-sm">
                      <input
                        type="checkbox"
                        checked={editingService.is_routable}
                        onChange={(e) => setEditingService(prev => ({ ...prev, is_routable: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Routable
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingService(null)}
                      className="flex-1 px-3 py-2 bg-white/10 text-white rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveService(serviceId)}
                      disabled={saving}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-semibold">{service.name}</h3>
                    <p className="text-green-400 text-lg font-bold">
                      {service.is_quote ? 'Quote' : `$${(service.price || 0).toFixed(2)}`}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {service.is_routable && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded">Routable</span>
                      )}
                      {service.is_quote && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded">Quote</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingService({ id: serviceId, ...service })}
                    className="px-3 py-1 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pay Per Stop Settings */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="text-green-400" />
          Contractor Pay Rate
        </h2>
        <p className="text-white/60 mb-4">Set the amount contractors earn per completed stop.</p>
        
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label className="text-white/60 text-sm mb-1 block">Pay Per Stop ($)</label>
            <div className="flex items-center">
              <span className="text-white text-2xl mr-2">$</span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={payPerStop}
                onChange={(e) => setPayPerStop(e.target.value)}
                className="w-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-xl font-bold"
                data-testid="pay-per-stop-input"
              />
            </div>
          </div>
          <button
            onClick={savePayPerStop}
            disabled={saving}
            className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 font-bold"
            data-testid="save-pay-per-stop-btn"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-500/20 rounded-xl">
          <p className="text-blue-300 text-sm">
            <strong>Current Rate:</strong> ${settings?.pay_per_stop?.toFixed(2) || '11.00'} per completed stop<br/>
            <strong>Default Rate:</strong> ${settings?.default_pay_per_stop?.toFixed(2) || '11.00'}
          </p>
        </div>
      </div>

      {/* Truck Rental Prices */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Truck className="text-blue-400" />
          Truck Rental Prices
        </h2>
        <p className="text-white/60 mb-4">Set weekly rental prices for contractor trucks.</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Small Truck */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">Small Truck</h3>
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">$</span>
              <input
                type="number"
                step="5"
                min="0"
                value={smallTruckPrice}
                onChange={(e) => setSmallTruckPrice(e.target.value)}
                className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-bold"
              />
              <span className="text-white/60">/week</span>
            </div>
          </div>
          
          {/* Large Truck */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-2">Large Truck</h3>
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">$</span>
              <input
                type="number"
                step="5"
                min="0"
                value={largeTruckPrice}
                onChange={(e) => setLargeTruckPrice(e.target.value)}
                className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white font-bold"
              />
              <span className="text-white/60">/week</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={saveTruckPrices}
          disabled={saving}
          className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 font-bold"
        >
          {saving ? 'Saving...' : 'Save Truck Prices'}
        </button>
      </div>
    </div>
  );
}



// Payroll Management Page
function PayrollPage() {
  const [pendingPayroll, setPendingPayroll] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAll, setProcessingAll] = useState(false);
  const [totalPending, setTotalPending] = useState(0);
  const [payPerStopRate, setPayPerStopRate] = useState(11);
  const [selectedPayStub, setSelectedPayStub] = useState(null);
  const [loadingStub, setLoadingStub] = useState(false);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      const [pendingRes, historyRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/payroll/pending`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/payroll/history`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admin/settings`, { headers: getAuthHeaders() })
      ]);
      
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingPayroll(pendingData.payroll_summary || []);
        setTotalPending(pendingData.total_pending || 0);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setPayrollHistory(historyData.history || []);
      }
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setPayPerStopRate(settingsData.pay_per_stop || 11);
      }
    } catch (err) {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async (contractorId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/payroll/process/${contractorId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`Paid $${data.amount.toFixed(2)} for ${data.stops_paid} stops`);
      fetchPayrollData();
    } catch (err) {
      toast.error('Failed to process payroll');
    }
  };

  const processAllPayroll = async () => {
    setProcessingAll(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/payroll/process-all`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`Processed $${data.total_paid.toFixed(2)} for ${data.processed.length} contractors`);
      fetchPayrollData();
    } catch (err) {
      toast.error('Failed to process payroll');
    } finally {
      setProcessingAll(false);
    }
  };

  const viewPayStub = async (record) => {
    setLoadingStub(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/payroll/${record.id}/paystub`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load pay stub');
      const stubData = await res.json();
      setSelectedPayStub({
        id: stubData.paystub_id,
        contractor_name: stubData.contractor?.name || record.contractor_name,
        period_start: stubData.pay_period?.start,
        period_end: stubData.pay_period?.end,
        stops_paid: stubData.earnings?.completed_stops || record.stops_paid,
        pay_rate: stubData.earnings?.rate_per_stop || 11,
        amount: stubData.net_pay || record.amount,
        cns_stops: record.cns_stops || 0,
        paid_at: stubData.paid_date,
        ytd_earnings: stubData.ytd_earnings || 0
      });
    } catch (err) {
      toast.error('Failed to load pay stub');
    } finally {
      setLoadingStub(false);
    }
  };

  const printPayStub = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pay Stub - ${selectedPayStub.contractor_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .company-info { color: #666; font-size: 12px; }
          .stub-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f5f5f5; }
          .total-row { font-weight: bold; background: #e8f5e9; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">UP-WASH POWER WASHING</div>
          <div class="company-info">Professional Power Washing Services</div>
        </div>
        
        <div class="stub-info">
          <div>
            <strong>Employee:</strong> ${selectedPayStub.contractor_name}<br>
            <strong>Period:</strong> ${new Date(selectedPayStub.period_start).toLocaleDateString()} - ${new Date(selectedPayStub.period_end).toLocaleDateString()}
          </div>
          <div style="text-align: right;">
            <strong>Pay Date:</strong> ${new Date(selectedPayStub.paid_at).toLocaleDateString()}<br>
            <strong>Stub #:</strong> ${selectedPayStub.id.substring(0, 8).toUpperCase()}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Earnings</div>
          <table>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>Completed Stops</td>
              <td>${selectedPayStub.stops_paid}</td>
              <td>$${selectedPayStub.pay_rate.toFixed(2)}</td>
              <td>$${selectedPayStub.amount.toFixed(2)}</td>
            </tr>
            ${selectedPayStub.cns_stops > 0 ? `
            <tr>
              <td>CNS (Cannot Service) Stops</td>
              <td>${selectedPayStub.cns_stops}</td>
              <td>$0.00</td>
              <td>$0.00</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="3">TOTAL EARNINGS</td>
              <td>$${selectedPayStub.amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Summary</div>
          <table>
            <tr>
              <td>Total Stops Worked</td>
              <td>${selectedPayStub.stops_paid + (selectedPayStub.cns_stops || 0)}</td>
            </tr>
            <tr>
              <td>Payable Stops</td>
              <td>${selectedPayStub.stops_paid}</td>
            </tr>
            <tr>
              <td>Pay Rate Per Stop</td>
              <td>$${selectedPayStub.pay_rate.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Net Pay</strong></td>
              <td><strong>$${selectedPayStub.amount.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated pay stub. For questions, contact admin@upwash.com</p>
          <p>Up-Wash Power Washing | Professional Services Since 2020</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Banknote className="text-green-400" />
          Payroll Management
        </h1>
        {pendingPayroll.length > 0 && (
          <button
            onClick={processAllPayroll}
            disabled={processingAll}
            className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
            data-testid="pay-all-btn"
          >
            {processingAll ? 'Processing...' : `Pay All ($${totalPending.toFixed(2)})`}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">${totalPending.toFixed(2)}</p>
          <p className="text-white/60">Pending Payments</p>
        </div>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{pendingPayroll.reduce((acc, c) => acc + c.completed_stops, 0)}</p>
          <p className="text-white/60">Unpaid Stops</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">${payPerStopRate.toFixed(2)}</p>
          <p className="text-white/60">Per Stop Rate</p>
        </div>
      </div>

      {/* Pending Payments */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4">Pending Contractor Payments</h2>
        {pendingPayroll.length === 0 ? (
          <p className="text-white/60 text-center py-8">No pending payments</p>
        ) : (
          <div className="space-y-3">
            {pendingPayroll.map((contractor) => (
              <div key={contractor.contractor_id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-white font-semibold">{contractor.contractor_name}</p>
                  <p className="text-white/60 text-sm">{contractor.phone}</p>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span className="text-green-400">{contractor.completed_stops} completed</span>
                    <span className="text-red-400">{contractor.cns_stops} CNS (no pay)</span>
                  </div>
                  {contractor.last_paid && (
                    <p className="text-white/40 text-xs mt-1">Last paid: {new Date(contractor.last_paid).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-green-400">${contractor.unpaid_amount.toFixed(2)}</span>
                  <button
                    onClick={() => processPayroll(contractor.contractor_id)}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                    data-testid={`pay-contractor-${contractor.contractor_id}`}
                  >
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History with Pay Stubs */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4">Payment History & Pay Stubs</h2>
        {payrollHistory.length === 0 ? (
          <p className="text-white/60 text-center py-8">No payment history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-white/60 text-sm">Date</th>
                  <th className="py-3 px-4 text-white/60 text-sm">Contractor</th>
                  <th className="py-3 px-4 text-white/60 text-sm">Stops</th>
                  <th className="py-3 px-4 text-white/60 text-sm">Amount</th>
                  <th className="py-3 px-4 text-white/60 text-sm">Pay Stub</th>
                </tr>
              </thead>
              <tbody>
                {payrollHistory.slice(0, 20).map((record) => (
                  <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{new Date(record.paid_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-white">{record.contractor_name}</td>
                    <td className="py-3 px-4 text-white">{record.stops_paid}</td>
                    <td className="py-3 px-4 text-green-400 font-bold">${record.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => viewPayStub(record)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 flex items-center gap-1"
                        data-testid={`view-stub-${record.id}`}
                      >
                        <FileText className="w-4 h-4" />
                        View Stub
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Stub Modal */}
      {selectedPayStub && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPayStub(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Pay Stub</h2>
                <p className="text-white/60">#{selectedPayStub.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={printPayStub}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Print
                </button>
                <button onClick={() => setSelectedPayStub(null)} className="text-white/60 hover:text-white p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Pay Stub Content */}
            <div className="bg-white/10 rounded-xl p-6 space-y-6">
              {/* Header */}
              <div className="text-center border-b border-white/20 pb-4">
                <h3 className="text-xl font-bold text-blue-400">UP-WASH POWER WASHING</h3>
                <p className="text-white/60 text-sm">Professional Power Washing Services</p>
              </div>

              {/* Employee & Period Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Contractor</p>
                  <p className="text-white font-semibold text-lg">{selectedPayStub.contractor_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-sm">Pay Period</p>
                  <p className="text-white">
                    {new Date(selectedPayStub.period_start).toLocaleDateString()} - {new Date(selectedPayStub.period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div>
                <h4 className="text-white font-semibold mb-3 border-b border-white/20 pb-2">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Completed Stops</span>
                    <span className="text-white">{selectedPayStub.stops_paid} × ${selectedPayStub.pay_rate.toFixed(2)} = <span className="text-green-400 font-bold">${selectedPayStub.amount.toFixed(2)}</span></span>
                  </div>
                  {selectedPayStub.cns_stops > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">CNS Stops (No Pay)</span>
                      <span className="text-white/60">{selectedPayStub.cns_stops} × $0.00 = $0.00</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-green-500/20 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold text-lg">NET PAY</span>
                  <span className="text-green-400 font-bold text-2xl">${selectedPayStub.amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-white/40 text-xs pt-4 border-t border-white/10">
                <p>Pay Date: {new Date(selectedPayStub.paid_at).toLocaleDateString()}</p>
                <p className="mt-1">This is a computer-generated pay stub.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// SMS Logs Page
function SMSLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/logs`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      toast.error('Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  };

  const sendPaymentReminders = async () => {
    if (!window.confirm('Send payment reminders to all customers with services in 3 days?')) return;
    
    setSendingReminders(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/send-payment-reminders`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`Payment reminders: ${data.sent} sent, ${data.skipped} skipped`);
      fetchLogs();
    } catch (err) {
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const toggleLogSelection = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) ? prev.filter(id => id !== logId) : [...prev, logId]
    );
  };

  const deleteLog = async (logId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sms-logs/${logId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Log deleted');
      fetchLogs();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const bulkDeleteLogs = async () => {
    if (selectedLogs.length === 0) return;
    if (!window.confirm(`Delete ${selectedLogs.length} selected logs?`)) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/sms-logs/bulk-delete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedLogs })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Deleted ${selectedLogs.length} logs`);
      setSelectedLogs([]);
      fetchLogs();
    } catch (err) {
      toast.error('Failed to delete logs');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllLogs = async () => {
    if (!window.confirm('Delete ALL SMS logs? This cannot be undone.')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/sms-logs/all`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(data.message);
      setSelectedLogs([]);
      fetchLogs();
    } catch (err) {
      toast.error('Failed to delete logs');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MessageCircle className="text-teal-400" />
          SMS Logs ({logs.length})
        </h1>
        <div className="flex gap-2">
          {selectedLogs.length > 0 && (
            <button
              onClick={bulkDeleteLogs}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-xl flex items-center gap-2 hover:bg-red-600"
            >
              <Trash2 className="w-5 h-5" />
              Delete Selected ({selectedLogs.length})
            </button>
          )}
          {logs.length > 0 && (
            <button
              onClick={deleteAllLogs}
              disabled={deleting}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl flex items-center gap-2 hover:bg-red-500/30"
            >
              <Trash2 className="w-5 h-5" />
              Delete All
            </button>
          )}
          <button
            onClick={sendPaymentReminders}
            disabled={sendingReminders}
            className="px-4 py-2 bg-green-500 text-white rounded-xl flex items-center gap-2 hover:bg-green-600"
            data-testid="send-payment-reminders-btn"
          >
            {sendingReminders ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
            Send Payment Reminders (3-Day)
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        {logs.length === 0 ? (
          <p className="text-white/60 text-center py-8">No SMS messages sent yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedLogs.includes(log.id)}
                  onChange={() => toggleLogSelection(log.id)}
                  className="w-5 h-5 mt-1 rounded"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="text-white font-medium">{log.to_phone}</p>
                      <p className="text-white/70 text-sm mt-1">{log.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                        log.status === 'delivered_in_app' ? 'bg-blue-500/20 text-blue-400' :
                        log.status === 'demo_logged' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs mt-2">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// Documents Management Page
function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [sendingDocument, setSendingDocument] = useState(null);
  const [documentType, setDocumentType] = useState('weekly');
  const [clientEmail, setClientEmail] = useState('');
  const [pricePerService, setPricePerService] = useState('');
  const [bookings, setBookings] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchBookings();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/documents`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings?status=completed&payment_type=quote`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings');
    }
  };

  const addDocument = async () => {
    if (!newDocTitle || !newDocContent) {
      toast.error('Please enter document title and content');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/documents/documents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newDocTitle, content: newDocContent })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Document added!');
      setShowDocModal(false);
      setNewDocTitle('');
      setNewDocContent('');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to add document');
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await fetch(`${API_URL}/api/admin/documents/documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const sendDocument = async () => {
    if (!sendingDocument || !clientEmail) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/quotes/${sendingDocument.id}/send-document`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          booking_id: sendingDocument.id,
          document_type: documentType,
          client_email: clientEmail,
          price_per_service: parseFloat(pricePerService) || sendingDocument.total
        })
      });

      if (!res.ok) throw new Error('Failed to send document');
      toast.success('Document sent successfully!');
      setShowSendModal(false);
      setSendingDocument(null);
      setClientEmail('');
      setPricePerService('');
      fetchDocuments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  const pendingDocuments = documents.filter(c => c.status === 'pending');
  const signedDocuments = documents.filter(c => c.status === 'signed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileText className="text-purple-400" />
          Service Documents
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDocModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Document
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Send New Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/10 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{documents.length}</p>
          <p className="text-white/60">Total Documents</p>
        </div>
        <div className="bg-yellow-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{pendingDocuments.length}</p>
          <p className="text-white/60">Pending Signature</p>
        </div>
        <div className="bg-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{signedDocuments.length}</p>
          <p className="text-white/60">Signed</p>
        </div>
        <div className="bg-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{documents.length}</p>
          <p className="text-white/60">Documents</p>
        </div>
      </div>

      {/* Document Documents */}
      {documents.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-400 mb-4">Document Documents</h2>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{doc.title}</p>
                    <p className="text-white/60 text-sm mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.content.substring(0, 500)}{doc.content.length > 500 ? '...' : ''}</p>
                    <p className="text-white/40 text-xs mt-2">Added: {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Documents */}
      {pendingDocuments.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-4">Awaiting Signature</h2>
          <div className="space-y-3">
            {pendingDocuments.map((document) => (
              <div key={document.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <p className="text-white font-semibold">{document.client_name || document.client_email}</p>
                    <p className="text-white/60 text-sm">{document.frequency} Service - ${document.price_per_service?.toFixed(2)}/visit</p>
                    <p className="text-white/40 text-xs">Sent: {new Date(document.sent_at).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-500/30 text-yellow-400 rounded-full text-sm">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signed Documents */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4">Signed Documents</h2>
        {signedDocuments.length === 0 ? (
          <p className="text-white/60 text-center py-8">No signed documents yet</p>
        ) : (
          <div className="space-y-3">
            {signedDocuments.map((document) => (
              <div key={document.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <p className="text-white font-semibold">{document.client_name || document.client_email}</p>
                    <p className="text-white/60 text-sm">{document.frequency} Service - ${document.price_per_service?.toFixed(2)}/visit</p>
                    <p className="text-green-400 text-xs">Signed: {new Date(document.signed_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {document.signature_data && (
                      <img src={`${API_URL}${document.signature_data}`} alt="Signature" className="h-10 bg-white rounded" />
                    )}
                    <span className="px-3 py-1 bg-green-500/30 text-green-400 rounded-full text-sm">
                      ✓ Signed
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Document Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl max-w-lg w-full"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Send Service Document</h2>
                <button onClick={() => setShowSendModal(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Select Booking */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">Select Quote/Booking</label>
                <select
                  value={sendingDocument?.id || ''}
                  onChange={(e) => {
                    const booking = bookings.find(b => b.id === e.target.value);
                    setSendingDocument(booking);
                    if (booking) {
                      setClientEmail(booking.customer_email || '');
                      setPricePerService(booking.total?.toString() || '');
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                >
                  <option value="">Select a booking...</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>{b.customer_name} - ${b.total?.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {/* Client Email */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">Service Frequency</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDocumentType('weekly')}
                    className={`flex-1 py-3 rounded-xl ${documentType === 'weekly' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setDocumentType('biweekly')}
                    className={`flex-1 py-3 rounded-xl ${documentType === 'biweekly' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}`}
                  >
                    Bi-Weekly
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-white/60 text-sm mb-1 block">Price Per Service</label>
                <input
                  type="number"
                  value={pricePerService}
                  onChange={(e) => setPricePerService(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
                />
              </div>

              <button
                onClick={sendDocument}
                disabled={!sendingDocument || !clientEmail}
                className="w-full py-4 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Send Document
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add Document Document</h2>
                <button onClick={() => setShowDocModal(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-white/60 text-sm">Copy and paste your document document content below:</p>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Document Title *</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g., Standard Service Agreement"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-1 block">Document Content *</label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="Paste your document content here..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 min-h-[300px] font-mono text-sm"
                  data-testid="document-doc-content"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={addDocument}
                  disabled={!newDocTitle || !newDocContent}
                  className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Document
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


// Messages Page - 2-Way Admin-Contractor Messaging with Timestamps
function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [messageThreads, setMessageThreads] = useState({});

  useEffect(() => {
    fetchContractors();
    fetchAllMessages();
  }, []);

  useEffect(() => {
    if (selectedContractor) {
      fetchContractorThread(selectedContractor);
    }
  }, [selectedContractor]);

  const fetchContractors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/contractors`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractors(data.contractors || []);
    } catch (err) {
      console.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractors/all`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages');
    }
  };

  const fetchContractorThread = async (contractorId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractor/history/${contractorId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMessageThreads(prev => ({ ...prev, [contractorId]: data.messages || [] }));
    } catch (err) {
      console.error('Failed to load thread');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContractor) {
      if (!selectedContractor) toast.error('Please select a contractor');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/sms/contractor`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contractor_id: selectedContractor,
          message: newMessage
        })
      });
      if (!res.ok) throw new Error('Failed to send');
      const data = await res.json();
      setNewMessage('');
      fetchContractorThread(selectedContractor);
      fetchAllMessages();
      if (data.status === 'sent') {
        toast.success(`SMS sent to ${data.contractor_name}!`);
      } else {
        toast.info(`Message logged (${data.status})`);
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUnreadCount = (contractorId) => {
    return messages.filter(m => 
      m.sender_id === contractorId && 
      m.sender_type === 'contractor' && 
      !m.read
    ).length;
  };

  if (loading) return <LoadingSpinner />;

  const currentThread = selectedContractor ? (messageThreads[selectedContractor] || []) : [];
  const selectedContractorInfo = contractors.find(c => c.id === selectedContractor);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <MessageSquare className="text-teal-400" />
        Messages
      </h1>

      <div className="grid md:grid-cols-3 gap-6 h-[600px]">
        {/* Contractor List */}
        <div className="bg-white/10 rounded-2xl p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">Contractors</h3>
          <div className="space-y-2">
            {contractors.length === 0 ? (
              <p className="text-white/60 text-sm">No contractors yet</p>
            ) : (
              contractors.map(c => {
                const unread = getUnreadCount(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractor(c.id)}
                    className={`w-full text-left p-3 rounded-xl transition flex justify-between items-center ${
                      selectedContractor === c.id ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div>
                      <span className="text-white font-medium">{c.full_name}</span>
                      <p className="text-white/60 text-xs">{c.phone || 'No phone'}</p>
                    </div>
                    {unread > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unread}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="md:col-span-2 bg-white/10 rounded-2xl p-4 flex flex-col">
          {/* Header */}
          <div className="pb-3 border-b border-white/20 mb-3">
            {selectedContractorInfo ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{selectedContractorInfo.full_name}</h3>
                  <p className="text-white/60 text-sm">{selectedContractorInfo.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-white/60">Select a contractor to start messaging</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {!selectedContractor ? (
              <p className="text-white/60 text-center py-8">Select a contractor to view messages</p>
            ) : currentThread.length === 0 ? (
              <p className="text-white/60 text-center py-8">No messages yet. Start a conversation!</p>
            ) : (
              [...currentThread].reverse().map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[80%] ${msg.sender_type === 'admin' ? 'ml-auto' : 'mr-auto'}`}
                >
                  <div className={`p-3 rounded-xl ${
                    msg.sender_type === 'admin' 
                      ? 'bg-teal-500/30' 
                      : 'bg-white/10'
                  }`}>
                    <p className="text-white">{msg.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs ${
                        msg.status === 'sent' ? 'text-green-400' : 
                        msg.status === 'failed' ? 'text-red-400' : 'text-white/40'
                      }`}>
                        {msg.status}
                      </span>
                      <span className="text-white/40 text-xs">
                        {formatTimestamp(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          {selectedContractor && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inquiry Messages Page (from Contact Form)
function InquiryMessagesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/inquiries`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/inquiries/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      fetchInquiries();
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Inbox className="text-cyan-400" />
        Inquiry Messages
      </h1>

      {inquiries.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <Inbox className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No inquiry messages yet</p>
          <p className="text-white/40 text-sm">Messages from the contact form will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className={`bg-white/10 backdrop-blur rounded-2xl p-6 border ${inquiry.read ? 'border-white/10' : 'border-cyan-500/50'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{inquiry.name}</h3>
                  <p className="text-white/60">{inquiry.email}</p>
                  <p className="text-white/60">{inquiry.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-sm">{new Date(inquiry.created_at).toLocaleDateString()}</p>
                  {!inquiry.read && (
                    <span className="inline-block px-2 py-1 bg-cyan-500 text-white text-xs rounded-full mt-1">New</span>
                  )}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <p className="text-white/80">{inquiry.message}</p>
              </div>
              
              <div className="flex gap-2">
                {!inquiry.read && (
                  <button
                    onClick={() => markAsRead(inquiry.id)}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                  >
                    Mark as Read
                  </button>
                )}
                <a
                  href={`mailto:${inquiry.email}`}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Reply via Email
                </a>
                <a
                  href={`tel:${inquiry.phone}`}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Admin Calendar Page
function CalendarPage() {
  const [calendarData, setCalendarData] = useState({});
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear]);

  const fetchCalendarData = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/calendar?month=${currentMonth + 1}&year=${currentYear}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCalendarData(data.calendar || {});
      setRoutes(data.routes || []);
    } catch (err) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const openRescheduleModal = (booking, currentDate) => {
    setRescheduleModal({ booking, currentDate });
    setRescheduleDate('');
    setSendSms(true);
    setCustomMessage('');
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) {
      toast.error('Please select a new date');
      return;
    }

    // Check if the new date is a weekday
    const newDateObj = new Date(rescheduleDate);
    if (newDateObj.getDay() === 0 || newDateObj.getDay() === 6) {
      toast.error('Please select a weekday (Monday-Friday)');
      return;
    }

    setRescheduling(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings/${rescheduleModal.booking.id}/reschedule`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          new_date: rescheduleDate,
          send_sms: sendSms,
          custom_message: customMessage || null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to reschedule');
      }

      const data = await res.json();
      toast.success(`Booking rescheduled from ${data.old_date} to ${data.new_date}${data.sms_sent ? '. SMS notification sent!' : ''}`);
      setRescheduleModal(null);
      setSelectedDate(null);
      fetchCalendarData();
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule booking');
    } finally {
      setRescheduling(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    // Empty cells for days before the first of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 h-24"></div>);
    }
    
    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const bookings = calendarData[dateStr] || [];
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      days.push(
        <div 
          key={day}
          onClick={() => setSelectedDate({ date: dateStr, bookings })}
          className={`p-2 h-24 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition ${
            isToday ? 'bg-blue-500/20 border-blue-500' : ''
          } ${isWeekend ? 'bg-white/5 opacity-60' : ''}`}
        >
          <div className={`text-sm font-bold ${isToday ? 'text-blue-400' : isWeekend ? 'text-white/40' : 'text-white'}`}>{day}</div>
          {bookings.length > 0 && (
            <div className="mt-1 space-y-1">
              {bookings.slice(0, 2).map((b, i) => (
                <div 
                  key={i} 
                  className={`text-xs px-1 py-0.5 rounded truncate ${
                    b.is_monthly 
                      ? 'bg-green-500/30 text-green-300' 
                      : b.payment_status === 'paid'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-yellow-500/30 text-yellow-300'
                  }`}
                >
                  {b.customer_name?.split(' ')[0]}
                </div>
              ))}
              {bookings.length > 2 && (
                <div className="text-xs text-white/60">+{bookings.length - 2} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <CalendarIcon className="text-blue-400" />
        Booking Calendar
      </h1>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white/10 rounded-xl p-4">
        <button onClick={goToPrevMonth} className="p-2 hover:bg-white/10 rounded-lg">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-xl font-bold text-white">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <button onClick={goToNextMonth} className="p-2 hover:bg-white/10 rounded-lg">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Calendar Legend */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/50 rounded"></div>
          <span className="text-white/60 text-sm">Subscription</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/50 rounded"></div>
          <span className="text-white/60 text-sm">Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500/50 rounded"></div>
          <span className="text-white/60 text-sm">Unpaid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white/20 rounded"></div>
          <span className="text-white/60 text-sm">Weekend (No Service)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white/10 rounded-2xl p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-white/60 text-sm font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </div>

      {/* Today's Routes */}
      <div className="bg-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Today's Routes</h3>
        {routes.length === 0 ? (
          <p className="text-white/60">No routes scheduled</p>
        ) : (
          <div className="space-y-3">
            {routes.map(route => (
              <div key={route.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{route.name}</p>
                  <p className="text-white/60 text-sm">{route.area}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 text-sm">{route.contractor_name || 'Unassigned'}</p>
                  <p className="text-white/60 text-sm">{route.bookings?.length || 0} stops</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Date Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDate(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedDate.date}</h2>
                <p className="text-white/60">{selectedDate.bookings.length} booking(s)</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedDate.bookings.length === 0 ? (
              <p className="text-white/60 text-center py-8">No bookings for this date</p>
            ) : (
              <div className="space-y-3">
                {selectedDate.bookings.map((booking, i) => (
                  <div key={i} className={`p-4 rounded-xl ${
                    booking.is_monthly 
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : 'bg-white/10'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{booking.customer_name}</p>
                        <p className="text-white/60 text-sm">{booking.address}</p>
                        
                        {/* Contact Info */}
                        <div className="mt-2 space-y-1">
                          {booking.customer_phone && (
                            <p className="text-white/70 text-sm flex items-center gap-2">
                              <Phone className="w-3 h-3" /> {booking.customer_phone}
                            </p>
                          )}
                          {booking.customer_email && (
                            <p className="text-white/70 text-sm flex items-center gap-2">
                              <Mail className="w-3 h-3" /> {booking.customer_email}
                            </p>
                          )}
                        </div>
                        
                        {/* Services */}
                        {booking.services && booking.services.length > 0 && (
                          <div className="mt-2">
                            <p className="text-white/50 text-xs">Services:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {booking.services.map((svc, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">
                                  {svc.name || svc.service_id} {svc.quantity > 1 ? `x${svc.quantity}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Assigned Contractor */}
                        <div className="mt-2">
                          <p className="text-white/50 text-xs">Assigned Contractor:</p>
                          <p className={`text-sm font-medium ${booking.assigned_contractor_name ? 'text-green-400' : 'text-yellow-400'}`}>
                            {booking.assigned_contractor_name || 'Not Assigned'}
                          </p>
                        </div>
                        
                        {/* Price */}
                        {booking.total && (
                          <p className="text-blue-400 font-bold mt-2">${booking.total.toFixed(2)}</p>
                        )}
                        
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {booking.is_monthly && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">Subscription</span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            booking.payment_status === 'paid' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-yellow-500 text-white'
                          }`}>
                            {booking.payment_status}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => openRescheduleModal(booking, selectedDate.date)}
                          className="px-3 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 flex items-center gap-1"
                          data-testid={`reschedule-btn-${booking.id}`}
                        >
                          <CalendarIcon className="w-4 h-4" />
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]" onClick={() => setRescheduleModal(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Reschedule Booking</h2>
            <p className="text-white/60 mb-6">
              Move <strong className="text-white">{rescheduleModal.booking.customer_name}</strong>'s booking to a new date.
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-white/60 text-sm">Current Date</p>
              <p className="text-white font-bold text-lg">{rescheduleModal.currentDate}</p>
              <p className="text-white/60 text-sm mt-2">Address</p>
              <p className="text-white text-sm">{rescheduleModal.booking.address}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-1">New Date (Weekdays Only) *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  data-testid="reschedule-date-input"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendSms"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="sendSms" className="text-white cursor-pointer">
                  Send SMS notification to customer
                </label>
              </div>

              {sendSms && (
                <div>
                  <label className="text-white/60 text-sm block mb-1">Custom Message (optional)</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Leave blank for default message..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white min-h-[100px]"
                    data-testid="reschedule-message-input"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    Default: "Hi [Name]! Your Up-Wash service has been rescheduled from [old date] to [new date]..."
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setRescheduleModal(null)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                  disabled={rescheduling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={rescheduling || !rescheduleDate}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="confirm-reschedule-btn"
                >
                  {rescheduling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Rescheduling...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-4 h-4" />
                      Confirm Reschedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ===================== CLIENTS PAGE =====================
function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clients/all`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createBookingForClient = (client) => {
    navigate('/admin/dashboard/create-booking', { state: { client } });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <UserCheck className="text-blue-400" />
          Client List ({clients.length})
        </h1>
        <button
          onClick={() => navigate('/admin/dashboard/create-booking')}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2"
          data-testid="add-new-client-btn"
        >
          <PlusCircle className="w-5 h-5" />
          New Booking
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
          data-testid="client-search-input"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{clients.length}</p>
          <p className="text-white/60 text-sm">Total Clients</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{clients.filter(c => c.is_subscriber).length}</p>
          <p className="text-white/60 text-sm">Subscribers</p>
        </div>
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{clients.filter(c => c.has_portal_account).length}</p>
          <p className="text-white/60 text-sm">Portal Accounts</p>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">${clients.reduce((sum, c) => sum + (c.total_spent || 0), 0).toFixed(0)}</p>
          <p className="text-white/60 text-sm">Total Revenue</p>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Client</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-left text-white/60 text-sm font-medium">Address</th>
                <th className="px-4 py-3 text-center text-white/60 text-sm font-medium">Bookings</th>
                <th className="px-4 py-3 text-center text-white/60 text-sm font-medium">Total Spent</th>
                <th className="px-4 py-3 text-center text-white/60 text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-center text-white/60 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/60">
                    {searchTerm ? 'No clients match your search' : 'No clients yet'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{client.name || 'Unknown'}</p>
                      {client.last_booking && (
                        <p className="text-white/40 text-xs">Last: {new Date(client.last_booking).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <a href={`mailto:${client.email}`} className="text-blue-400 text-sm hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {client.email || '-'}
                        </a>
                        <a href={`tel:${client.phone}`} className="text-green-400 text-sm hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {client.phone || '-'}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white/80 text-sm">{client.address || '-'}</p>
                      <p className="text-white/40 text-xs">{client.city} {client.state} {client.zip}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-bold">{client.total_bookings || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-400 font-bold">${(client.total_spent || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col gap-1 items-center">
                        {client.is_subscriber && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Subscriber</span>
                        )}
                        {client.has_portal_account && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Portal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="px-3 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
                          data-testid={`view-client-${client.phone}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => createBookingForClient(client)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                          data-testid={`book-client-${client.phone}`}
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClient(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                <p className="text-white/60">Client Details</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm">Email</p>
                  <p className="text-white">{selectedClient.email || '-'}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm">Phone</p>
                  <p className="text-white">{selectedClient.phone || '-'}</p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-sm">Address</p>
                <p className="text-white">{selectedClient.address}</p>
                <p className="text-white/60">{selectedClient.city} {selectedClient.state} {selectedClient.zip}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{selectedClient.total_bookings}</p>
                  <p className="text-white/60 text-sm">Total Bookings</p>
                </div>
                <div className="bg-green-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">${(selectedClient.total_spent || 0).toFixed(2)}</p>
                  <p className="text-white/60 text-sm">Total Spent</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedClient(null);
                  createBookingForClient(selectedClient);
                }}
                className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Create Booking for {selectedClient.name?.split(' ')[0]}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ===================== CREATE BOOKING PAGE =====================
function CreateBookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefillClient = location.state?.client;
  
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState(prefillClient?.name || '');
  const [customerEmail, setCustomerEmail] = useState(prefillClient?.email || '');
  const [customerPhone, setCustomerPhone] = useState(prefillClient?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(prefillClient?.address || '');
  const [customerCity, setCustomerCity] = useState(prefillClient?.city || '');
  const [customerState, setCustomerState] = useState(prefillClient?.state || 'TX');
  const [customerZip, setCustomerZip] = useState(prefillClient?.zip || '');
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookingDates, setBookingDates] = useState(['']);
  const [isMonthly, setIsMonthly] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [notes, setNotes] = useState('');
  const [totalOverride, setTotalOverride] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setServices(data.services || {});
    } catch (err) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    let subtotal = 0;
    selectedServices.forEach(serviceId => {
      if (services[serviceId] && !services[serviceId].is_quote) {
        subtotal += services[serviceId].price || 0;
      }
    });
    if (isMonthly) subtotal *= 0.95;
    const tax = subtotal * 0.0825;
    return { subtotal, tax, total: subtotal + tax };
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(s => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const addBookingDate = () => {
    setBookingDates([...bookingDates, '']);
  };

  const updateBookingDate = (index, value) => {
    const newDates = [...bookingDates];
    newDates[index] = value;
    setBookingDates(newDates);
  };

  const removeBookingDate = (index) => {
    if (bookingDates.length > 1) {
      setBookingDates(bookingDates.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName || !customerPhone || !customerAddress || !customerZip) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    
    const validDates = bookingDates.filter(d => d);
    if (validDates.length === 0) {
      toast.error('Please select at least one booking date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bookings/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_city: customerCity,
          customer_state: customerState,
          customer_zip: customerZip,
          services: selectedServices,
          booking_dates: validDates,
          is_monthly: isMonthly,
          payment_status: paymentStatus,
          notes: notes,
          total_override: totalOverride ? parseFloat(totalOverride) : null
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create booking');
      }

      toast.success('Booking created successfully!');
      navigate('/admin/dashboard/pending');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotal();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <PlusCircle className="text-blue-400" />
        Create New Booking
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="text-blue-400" />
            Customer Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Full Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="John Smith"
                required
                data-testid="customer-name-input"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Phone *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="(817) 555-1234"
                required
                data-testid="customer-phone-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-white/60 text-sm block mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="john@example.com"
                data-testid="customer-email-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-white/60 text-sm block mb-1">Street Address *</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="123 Main St"
                required
                data-testid="customer-address-input"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">City</label>
              <input
                type="text"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="Burleson"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm block mb-1">State</label>
                <input
                  type="text"
                  value={customerState}
                  onChange={(e) => setCustomerState(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm block mb-1">ZIP *</label>
                <input
                  type="text"
                  value={customerZip}
                  onChange={(e) => setCustomerZip(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  placeholder="76028"
                  required
                  data-testid="customer-zip-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Services Selection */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Droplets className="text-blue-400" />
            Select Services *
          </h2>
          
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(services).map(([id, service]) => (
              <div
                key={id}
                onClick={() => toggleService(id)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition ${
                  selectedServices.includes(id)
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
                data-testid={`service-${id}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-semibold">{service.name}</p>
                    <p className="text-green-400 text-lg font-bold">
                      {service.is_quote ? 'Quote' : `$${service.price?.toFixed(2)}`}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedServices.includes(id) ? 'bg-blue-500 border-blue-500' : 'border-white/30'
                  }`}>
                    {selectedServices.includes(id) && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Dates */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="text-blue-400" />
            Booking Date(s) *
          </h2>
          
          <div className="space-y-3">
            {bookingDates.map((date, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => updateBookingDate(index, e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  min={new Date().toISOString().split('T')[0]}
                  data-testid={`booking-date-${index}`}
                />
                {bookingDates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBookingDate(index)}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBookingDate}
              className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-white/40 hover:text-white"
            >
              + Add Another Date
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="isMonthly"
              checked={isMonthly}
              onChange={(e) => setIsMonthly(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="isMonthly" className="text-white cursor-pointer">
              Monthly Subscription (5% discount)
            </label>
          </div>
        </div>

        {/* Payment & Notes */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="text-green-400" />
            Payment & Notes
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                data-testid="payment-status-select"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Total Override ($)</label>
              <input
                type="number"
                step="0.01"
                value={totalOverride}
                onChange={(e) => setTotalOverride(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                placeholder="Leave empty to auto-calculate"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-white/60 text-sm block mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white min-h-[100px]"
                placeholder="Any special instructions or notes..."
                data-testid="notes-input"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
          <div className="space-y-2">
            {selectedServices.map(serviceId => (
              <div key={serviceId} className="flex justify-between text-white">
                <span>{services[serviceId]?.name}</span>
                <span>{services[serviceId]?.is_quote ? 'Quote' : `$${services[serviceId]?.price?.toFixed(2)}`}</span>
              </div>
            ))}
            {isMonthly && (
              <div className="flex justify-between text-green-400">
                <span>Monthly Discount (5%)</span>
                <span>-${(totals.subtotal * 0.0526).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/20 pt-2 mt-2">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Tax (8.25%)</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2">
                <span>Total</span>
                <span>{totalOverride ? `$${parseFloat(totalOverride).toFixed(2)}` : `$${totals.total.toFixed(2)}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          data-testid="create-booking-submit"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Creating Booking...
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              Create Booking
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// Unpaid Subscriptions Page
function UnpaidSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnpaidSubscriptions();
  }, []);

  const fetchUnpaidSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/unpaid-subscriptions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSubscriptions(data.unpaid_subscriptions || []);
    } catch (err) {
      toast.error('Failed to load unpaid subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const reactivateSubscription = async (bookingId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${bookingId}/status?status=active`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Subscription reactivated');
      fetchUnpaidSubscriptions();
    } catch (err) {
      toast.error('Failed to reactivate subscription');
    }
  };

  const cancelSubscription = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription? This will remove them from routes.')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions/${bookingId}/status?status=cancelled`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Subscription cancelled');
      fetchUnpaidSubscriptions();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <AlertCircle className="text-red-400" />
        Unpaid Subscriptions
      </h1>

      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-300">
          These subscription clients have failed payments. They have been automatically removed from routes until payment is updated.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-white/60">No unpaid subscriptions</p>
          <p className="text-white/40 text-sm">All subscription payments are up to date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-red-500/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{sub.customer_name}</h3>
                  <p className="text-white/60">{sub.customer_phone}</p>
                  <p className="text-white/60">{sub.customer_email}</p>
                  <p className="text-white/60 text-sm mt-2">{sub.customer_address}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold">${sub.total?.toFixed(2)}/month</p>
                  <p className="text-white/60 text-sm">{sub.service_days_per_month} days/month</p>
                  <p className="text-red-300 text-sm mt-2">Payment Failed</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <p className="text-white/60 text-sm">
                  <strong>Service Days:</strong> {sub.monthly_service_days?.map(d => {
                    const suffix = d === 1 || d === 21 || d === 31 ? 'st' : 
                                  d === 2 || d === 22 ? 'nd' : 
                                  d === 3 || d === 23 ? 'rd' : 'th';
                    return `${d}${suffix}`;
                  }).join(', ')} of each month
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => reactivateSubscription(sub.id)}
                  className="flex-1 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                >
                  Reactivate (Payment Updated)
                </button>
                <button
                  onClick={() => cancelSubscription(sub.id)}
                  className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

// Main Admin Dashboard
export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const [releasedRoutesCount, setReleasedRoutesCount] = useState(0);
  const [pendingRoutesCount, setPendingRoutesCount] = useState(0);
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [scentBombCount, setScentBombCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const lastMessageIdRef = useRef(null);
  const lastReleasedCountRef = useRef(0);
  const lastBookingsCountRef = useRef(0);
  const lastScentBombCountRef = useRef(0);
  const audioRef = useRef(null);
  const urgentAudioRef = useRef(null);

  // Urgent notification sound (different tone)
  const URGENT_SOUND = "data:audio/wav;base64,UklGRl9vT19teleAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXcAAH//f/9//3//f/9//3//f/9//3//f/8AAAAAAAAAAAAA//////////////////8AAAAAAAAAAAAA//////////////////8AAAAAAAAAAAAA";

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Comprehensive notification check
  useEffect(() => {
    const checkAllNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/notifications`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const counts = data.counts || {};
        
        // Update individual counts
        setNewBookingsCount(counts.new_bookings || 0);
        setScentBombCount(counts.scent_bombs || 0);
        
        // Check for new scent bomb orders
        if (counts.scent_bombs > lastScentBombCountRef.current && lastScentBombCountRef.current >= 0) {
          playNotificationSound();
          toast.success('🎉 New Scent Bomb Order!', { duration: 5000 });
          showBrowserNotification({ 
            sender_name: 'New Order', 
            content: 'A new Scent Bomb order has been placed!' 
          });
        }
        lastScentBombCountRef.current = counts.scent_bombs || 0;
        
        // Check for new bookings (routes)
        if (counts.new_bookings > lastBookingsCountRef.current && lastBookingsCountRef.current >= 0) {
          playNotificationSound();
          toast.success('📍 New Booking Added to Routes!', { duration: 5000 });
        }
        lastBookingsCountRef.current = counts.new_bookings || 0;
        
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    checkAllNotifications();
    const interval = setInterval(checkAllNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check for released routes
  useEffect(() => {
    const checkReleasedRoutes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/released-routes`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const available = (data.released_routes || []).filter(r => r.status === 'available').length;
        
        // Play URGENT sound if new released route
        if (available > lastReleasedCountRef.current && lastReleasedCountRef.current > 0) {
          playUrgentSound();
          toast.error('⚠️ URGENT: Route Released by Contractor!', { duration: 10000 });
          showBrowserNotification({ 
            sender_name: '⚠️ URGENT', 
            content: 'A contractor has released a route! Immediate action required.' 
          });
        }
        lastReleasedCountRef.current = available;
        setReleasedRoutesCount(available);
      } catch (err) {
        console.error('Failed to check released routes:', err);
      }
    };

    const checkPendingRoutes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/routes`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const pending = (data.routes || []).filter(r => !r.assigned_contractor_id).length;
        setPendingRoutesCount(pending);
      } catch (err) {
        console.error('Failed to check pending routes:', err);
      }
    };

    checkReleasedRoutes();
    checkPendingRoutes();
    const interval = setInterval(() => {
      checkReleasedRoutes();
      checkPendingRoutes();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/messages`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const messages = data.messages || [];
        
        const unread = messages.filter(m => m.sender_id !== 'admin' && !m.read).length;
        setUnreadCount(unread);
        
        if (messages.length > 0) {
          const latestMsg = messages[0];
          if (latestMsg.sender_id !== 'admin' && latestMsg.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = latestMsg.id;
            setLatestMessage(latestMsg);
            setShowNotification(true);
            playNotificationSound();
            showBrowserNotification(latestMsg);
            setTimeout(() => setShowNotification(false), 5000);
          }
        }
      } catch (err) {
        console.error('Failed to check messages:', err);
      }
    };

    const checkInquiries = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/inquiries`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const unread = (data.inquiries || []).filter(i => !i.read).length;
        setUnreadInquiries(unread);
      } catch (err) {
        console.error('Failed to check inquiries:', err);
      }
    };

    checkMessages();
    checkInquiries();
    const interval = setInterval(() => {
      checkMessages();
      checkInquiries();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
      }
      audioRef.current.play().catch(console.error);
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  const playUrgentSound = () => {
    try {
      // Create urgent beeping sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern
      setTimeout(() => { gainNode.gain.value = 0; }, 200);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 300);
      setTimeout(() => { gainNode.gain.value = 0; }, 500);
      setTimeout(() => { gainNode.gain.value = 0.3; }, 600);
      setTimeout(() => { gainNode.gain.value = 0; oscillator.stop(); }, 800);
    } catch (err) {
      console.error('Failed to play urgent sound:', err);
    }
  };

  const showBrowserNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Message - Upwash Admin', {
        body: `${message.sender_name}: ${message.content}`,
        icon: '/favicon.ico',
        tag: 'upwash-message'
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/admin/login');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  // Mark notifications as read when tab clicked
  const handleNavClick = async (path) => {
    // Clear notification counts based on the path clicked
    const typeMap = {
      'messages': 'messages',
      'inquiries': 'inquiries',
      'released-routes': 'released_routes',
      'pending-routes': 'new_bookings'
    };
    
    const notifType = typeMap[path];
    if (notifType) {
      try {
        await fetch(`${API_URL}/api/admin/notifications/mark-read?notification_type=${notifType}`, {
          method: 'PATCH',
          headers: getAuthHeaders()
        });
        
        // Clear local count
        if (path === 'messages') setUnreadCount(0);
        if (path === 'inquiries') setUnreadInquiries(0);
        if (path === 'released-routes') setReleasedRoutesCount(0);
        if (path === 'pending-routes') setNewBookingsCount(0);
      } catch (err) {
        console.error('Failed to mark notifications read');
      }
    }
  };

  if (!user) return null;

  const currentPath = location.pathname.replace('/admin/dashboard/', '').replace('/admin/dashboard', '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Floating Notification */}
      <AnimatePresence>
        {showNotification && latestMessage && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-1/2 z-50 bg-teal-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer"
            onClick={() => {
              setShowNotification(false);
              navigate('/admin/dashboard/messages');
            }}
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">New Message from {latestMessage.sender_name}</p>
              <p className="text-white/80 text-sm truncate max-w-xs">{latestMessage.content}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNotification(false); }}
              className="ml-4 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col"
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-white">Upwash Admin</h1>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const badge = item.path === 'messages' ? unreadCount : 
                         item.path === 'inquiries' ? unreadInquiries : 
                         item.path === 'released-routes' ? releasedRoutesCount :
                         item.path === 'pending-routes' ? pendingRoutesCount : 0;
            
            const isReleasedRoutes = item.path === 'released-routes' && releasedRoutesCount > 0;
            
            return (
              <Link
                key={item.path}
                to={`/admin/dashboard/${item.path}`}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition relative ${
                  currentPath === item.path 
                    ? 'bg-blue-500 text-white' 
                    : isReleasedRoutes
                    ? 'released-routes-flash border-2'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative">
                  {isReleasedRoutes ? (
                    <div className="relative">
                      <AlertTriangle 
                        className="w-6 h-6 flex-shrink-0 icon-flash" 
                      />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                  )}
                  {badge > 0 && !isReleasedRoutes && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <span className={`flex-1 ${isReleasedRoutes ? 'font-bold text-flash' : ''}`}>
                    {isReleasedRoutes ? '⚠️ RELEASED ROUTES' : item.label}
                  </span>
                )}
                {sidebarOpen && badge > 0 && (
                  <span className={`text-white text-xs px-2 py-1 rounded-full ${
                    isReleasedRoutes ? 'badge-flash font-bold' : 'bg-red-500 animate-pulse'
                  }`}>
                    {badge} {isReleasedRoutes ? 'URGENT!' : 'new'}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/20 rounded-xl transition"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="create-booking" element={<CreateBookingPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="pending" element={<BookingsList status="pending" title="Pending Services" />} />
          <Route path="completed" element={<BookingsList status="completed" title="Completed Services" />} />
          <Route path="unpaid-subscriptions" element={<UnpaidSubscriptionsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="deleted-subscriptions" element={<DeletedSubscriptionsPage />} />
          <Route path="contractors" element={<ContractorsPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="sms-logs" element={<SMSLogsPage />} />
          <Route path="pending-routes" element={<RoutesPage />} />
          <Route path="released-routes" element={<ReleasedRoutesPage />} />
          <Route path="route-requests" element={<RouteRequestsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="inquiries" element={<InquiryMessagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
