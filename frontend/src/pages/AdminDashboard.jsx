import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, ClipboardList, CheckCircle, DollarSign, 
  Droplets, Users, MapPin, MessageSquare, LogOut, Menu, X,
  Clock, UserPlus, Key, FileText, Send, Route as RouteIcon,
  ChevronRight, Search, Filter, Eye, Edit, Trash2, Plus
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Auth helper
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Sidebar Navigation
const navItems = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard' },
  { path: 'pending', icon: Clock, label: 'Pending Services' },
  { path: 'completed', icon: CheckCircle, label: 'Completed Services' },
  { path: 'revenue', icon: DollarSign, label: 'Revenue' },
  { path: 'scent-bombs', icon: Droplets, label: 'Scent Bomb Orders' },
  { path: 'clients', icon: Users, label: 'Client Portal' },
  { path: 'contractors', icon: UserPlus, label: 'Contractors' },
  { path: 'routes', icon: RouteIcon, label: 'Routes' },
  { path: 'messages', icon: MessageSquare, label: 'Messages' },
];

// Dashboard Overview
function DashboardOverview() {
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

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'Total Bookings', value: stats?.total_bookings || 0, icon: ClipboardList, color: 'bg-blue-500' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Revenue', value: `$${(stats?.total_revenue || 0).toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Scent Bomb Orders', value: stats?.scent_bomb_orders || 0, icon: Droplets, color: 'bg-purple-500' },
    { label: 'Contractors', value: stats?.contractor_count || 0, icon: Users, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/60 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Bookings List Component
function BookingsList({ status, title }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {bookings.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

// Booking Card
function BookingCard({ booking, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 overflow-hidden"
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
            
            <div className="flex gap-2 pt-2">
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
              <button className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                Send Invoice
              </button>
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

// Revenue Page
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

      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white/10 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-white font-semibold">{booking.customer_name}</p>
              <p className="text-white/60 text-sm">{booking.booking_dates?.[0]}</p>
            </div>
            <p className="text-green-400 font-bold text-xl">${booking.total?.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Client Portal
function ClientPortal() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clients`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const sendInvoice = async (booking) => {
    const email = prompt('Enter email address for invoice:');
    if (!email) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_URL}/api/admin/invoices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          booking_id: booking.id,
          customer_email: email,
          due_date: dueDateStr
        })
      });
      if (!res.ok) throw new Error('Failed to send');
      toast.success('Invoice sent!');
    } catch (err) {
      toast.error('Failed to send invoice');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Users className="text-blue-400" />
        Client Portal
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        {clients.map((client) => (
          <motion.div
            key={client._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 cursor-pointer hover:bg-white/15 transition"
            onClick={() => setSelectedClient(client)}
          >
            <h3 className="text-xl font-bold text-white">{client.customer_name}</h3>
            <p className="text-white/60">{client.customer_phone}</p>
            <p className="text-white/60">{client.customer_email || 'No email'}</p>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-blue-400">{client.total_bookings} bookings</span>
              <span className="text-green-400">${(client.total_spent || 0).toFixed(2)} spent</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedClient(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedClient.customer_name}</h2>
                <p className="text-white/60">{selectedClient.customer_phone}</p>
                <p className="text-white/60">{selectedClient.customer_address}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Booking History</h3>
              {/* Client bookings would be loaded here */}
              <button
                onClick={() => sendInvoice(selectedClient)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Send Invoice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Contractors Management
function ContractorsPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContractor, setNewContractor] = useState({
    username: '', password: '', full_name: '', phone: '', email: ''
  });

  useEffect(() => {
    fetchContractors();
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
      const res = await fetch(`${API_URL}/api/admin/contractors/${contractorId}/password?new_password=${newPassword}`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to reset');
      toast.success('Password updated!');
    } catch (err) {
      toast.error('Failed to reset password');
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <UserPlus className="text-indigo-400" />
          Contractors
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-500 text-white rounded-xl flex items-center gap-2 hover:bg-indigo-600"
          data-testid="create-contractor-btn"
        >
          <Plus className="w-5 h-5" />
          Add Contractor
        </button>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No contractors yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{contractor.full_name}</h3>
                  <p className="text-white/60">@{contractor.username}</p>
                  <p className="text-white/60">{contractor.phone}</p>
                  <p className="text-white/60">{contractor.email || 'No email'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetPassword(contractor.id)}
                    className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30"
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
          ))}
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
    </div>
  );
}

// Routes Management
function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoute, setNewRoute] = useState({ name: '', description: '', area: '', price: 350 });

  useEffect(() => {
    fetchRoutes();
    fetchContractors();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/routes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRoutes(data.routes || []);
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
      toast.success('Route assigned!');
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to assign route');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <RouteIcon className="text-orange-400" />
          Routes Management
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl flex items-center gap-2 hover:bg-orange-600"
          data-testid="create-route-btn"
        >
          <Plus className="w-5 h-5" />
          Add Route
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No routes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <div key={route.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{route.name}</h3>
                  <p className="text-white/60">{route.description || 'No description'}</p>
                  <p className="text-white/60">Area: {route.area || 'Not specified'}</p>
                  <p className="text-green-400 font-bold mt-2">${route.price?.toFixed(2) || '350.00'}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-2">Assigned to:</p>
                  <select
                    value={route.assigned_contractor_id || ''}
                    onChange={(e) => assignRoute(route.id, e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="">Unassigned</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
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
                data-testid="route-name"
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
              <input
                type="number"
                placeholder="Price ($350 default)"
                value={newRoute.price}
                onChange={(e) => setNewRoute(prev => ({ ...prev, price: parseFloat(e.target.value) || 350 }))}
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
                  data-testid="save-route-btn"
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

// Messages Page
function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContractor, setSelectedContractor] = useState(null);

  useEffect(() => {
    fetchMessages();
    fetchContractors();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages');
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

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: newMessage,
          recipient_id: selectedContractor,
          is_group: false
        })
      });
      if (!res.ok) throw new Error('Failed to send');
      setNewMessage('');
      fetchMessages();
      toast.success('Message sent!');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <MessageSquare className="text-teal-400" />
        Messages
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Contractor List */}
        <div className="bg-white/10 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4">Contractors</h3>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedContractor(null)}
              className={`w-full text-left p-3 rounded-xl transition ${!selectedContractor ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <span className="text-white">Broadcast to All</span>
            </button>
            {contractors.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedContractor(c.id)}
                className={`w-full text-left p-3 rounded-xl transition ${selectedContractor === c.id ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <span className="text-white">{c.full_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 bg-white/10 rounded-2xl p-4 flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.length === 0 ? (
              <p className="text-white/60 text-center py-8">No messages yet</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`p-3 rounded-xl ${msg.sender_id === 'admin' ? 'bg-teal-500/30 ml-8' : 'bg-white/10 mr-8'}`}>
                  <p className="text-white/60 text-xs mb-1">{msg.sender_name}</p>
                  <p className="text-white">{msg.content}</p>
                </div>
              ))
            )}
          </div>

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
              className="px-4 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
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

  if (!user) return null;

  const currentPath = location.pathname.replace('/admin/dashboard/', '').replace('/admin/dashboard', '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
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

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={`/admin/dashboard/${item.path}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                currentPath === item.path 
                  ? 'bg-blue-500 text-white' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
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
          <Route path="pending" element={<BookingsList status="pending" title="Pending Services" />} />
          <Route path="completed" element={<BookingsList status="completed" title="Completed Services" />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="scent-bombs" element={<ScentBombOrders />} />
          <Route path="clients" element={<ClientPortal />} />
          <Route path="contractors" element={<ContractorsPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Routes>
      </main>
    </div>
  );
}
