import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Settings, Calendar, CreditCard, FileText, Bell,
  LogOut, Menu, X, Droplets, Mail, Phone, MapPin, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Bible Verses
const BIBLE_VERSES = [
  { verse: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { verse: "Trust in the LORD with all your heart.", reference: "Proverbs 3:5" },
  { verse: "The LORD is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { verse: "Be strong and courageous. Do not be afraid.", reference: "Joshua 1:9" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { verse: "The joy of the LORD is your strength.", reference: "Nehemiah 8:10" },
  { verse: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { verse: "God is our refuge and strength.", reference: "Psalm 46:1" },
  { verse: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { verse: "For I know the plans I have for you, declares the LORD.", reference: "Jeremiah 29:11" }
];

const CrossIcon = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z"/>
  </svg>
);

// Auth helper
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('client_token')}`
});

// Client Login Page
export function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentVerse = BIBLE_VERSES[Math.floor(Date.now() / (15 * 60 * 1000)) % BIBLE_VERSES.length];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('client_token', data.access_token);
      localStorage.setItem('client_user', JSON.stringify(data.client));
      toast.success('Welcome back!');
      navigate('/client/portal');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Bible Verse Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <CrossIcon className="text-white/80 flex-shrink-0" size={16} />
          <p className="text-white text-center text-sm">
            <span className="italic">"{currentVerse.verse}"</span>
            <span className="text-white/80 ml-2">— {currentVerse.reference}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Droplets className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Client Portal</h1>
              <p className="text-white/60">Upwash Power Washing</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/60 mb-2 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-2 text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm">
              ← Back to website
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Client Registration Page
export function ClientRegister() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', address: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const currentVerse = BIBLE_VERSES[Math.floor(Date.now() / (15 * 60 * 1000)) % BIBLE_VERSES.length];

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/client/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Registration failed');
      }

      toast.success('Account created! Please sign in.');
      navigate('/client/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Bible Verse Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <CrossIcon className="text-white/80 flex-shrink-0" size={16} />
          <p className="text-white text-center text-sm">
            <span className="italic">"{currentVerse.verse}"</span>
            <span className="text-white/80 ml-2">— {currentVerse.reference}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <User className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Create Account</h1>
              <p className="text-white/60">Join Upwash Subscribers</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-white/60 mb-2 text-sm">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-2 text-sm">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-2 text-sm">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-2 text-sm">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                placeholder="123 Main St, City, TX 76028"
              />
            </div>

            <div>
              <label className="block text-white/60 mb-2 text-sm">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50"
                placeholder="Create password (min 6 characters)"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/client/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Already have an account? Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Client Portal Dashboard
export default function ClientPortal() {
  const [client, setClient] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [pendingContracts, setPendingContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingContract, setSigningContract] = useState(null);
  const [signatureData, setSignatureData] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const navigate = useNavigate();
  const currentVerse = BIBLE_VERSES[Math.floor(Date.now() / (15 * 60 * 1000)) % BIBLE_VERSES.length];
  // New states for booking history and upcoming services
  const [bookingHistory, setBookingHistory] = useState([]);
  const [upcomingServices, setUpcomingServices] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('client_token');
    const clientData = localStorage.getItem('client_user');
    
    if (!token || !clientData) {
      navigate('/client/login');
      return;
    }

    setClient(JSON.parse(clientData));
    fetchClientData();
  }, [navigate]);

  const fetchClientData = async () => {
    try {
      const [subRes, contractRes, pendingRes, notifRes, historyRes, upcomingRes] = await Promise.all([
        fetch(`${API_URL}/api/client/subscription`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/client/contracts`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/client/contracts/pending`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/client/notifications`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/client/booking-history`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/client/upcoming-services`, { headers: getAuthHeaders() })
      ]);
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        setContracts(contractData.contracts || []);
      }
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingContracts(pendingData.contracts || []);
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setBookingHistory(historyData.bookings || []);
      }
      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        setUpcomingServices(upcomingData.services || []);
      }
    } catch (err) {
      console.error('Failed to fetch client data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/client/subscription/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: cancelReason })
      });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Subscription cancellation requested. We will contact you shortly.');
      setShowCancelModal(false);
      setCancelReason('');
      fetchClientData();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handlePauseSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/client/subscription/pause`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to pause');
      toast.success('Subscription paused successfully');
      fetchClientData();
    } catch (err) {
      toast.error('Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/client/subscription/resume`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to resume');
      toast.success('Subscription resumed successfully');
      fetchClientData();
    } catch (err) {
      toast.error('Failed to resume subscription');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_user');
    navigate('/client/login');
  };

  // Signature canvas functions
  const initCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      initCanvas(canvas);
    }
  };

  const openSigningModal = (contract) => {
    setSigningContract(contract);
    setAgreedTerms(false);
    setTimeout(() => {
      if (canvasRef.current) {
        initCanvas(canvasRef.current);
      }
    }, 100);
  };

  const submitSignature = async () => {
    if (!agreedTerms) {
      toast.error('Please agree to the terms before signing');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if signature is blank
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isBlank = true;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) {
        isBlank = false;
        break;
      }
    }

    if (isBlank) {
      toast.error('Please draw your signature');
      return;
    }

    setSubmitting(true);
    try {
      const signatureBase64 = canvas.toDataURL('image/png');
      
      const res = await fetch(`${API_URL}/api/client/contracts/${signingContract.id}/sign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          signature_data: signatureBase64,
          agreed_terms: true
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to sign contract');
      }

      toast.success('Contract signed successfully!');
      setSigningContract(null);
      fetchClientData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!client) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Bible Verse Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <CrossIcon className="text-white/80 flex-shrink-0" size={16} />
          <p className="text-white text-center text-sm">
            <span className="italic">"{currentVerse.verse}"</span>
            <span className="text-white/80 ml-2">— {currentVerse.reference}</span>
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur border-b border-white/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Droplets className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">My Account</h1>
              <p className="text-white/60 text-sm">Welcome, {client.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Section */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="text-blue-400" />
              Profile Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm">Name</p>
                <p className="text-white font-semibold">{client.name}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Email</p>
                <p className="text-white font-semibold">{client.email}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Phone</p>
                <p className="text-white font-semibold">{client.phone}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Address</p>
                <p className="text-white font-semibold">{client.address}</p>
              </div>
            </div>
          </div>

          {/* Notification Center */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="text-yellow-400" />
              Notifications
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {notifications.filter(n => !n.read).length} new
                </span>
              )}
            </h2>
            
            {notifications.length === 0 ? (
              <p className="text-white/60 text-center py-4">No notifications yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border ${
                      notif.read 
                        ? 'bg-white/5 border-white/10' 
                        : 'bg-blue-500/20 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notif.type?.includes('reschedule') ? 'bg-orange-500/20' :
                        notif.type?.includes('en_route') ? 'bg-green-500/20' :
                        notif.type?.includes('completion') ? 'bg-blue-500/20' :
                        notif.type?.includes('contract') ? 'bg-purple-500/20' :
                        'bg-yellow-500/20'
                      }`}>
                        {notif.type?.includes('reschedule') ? (
                          <Calendar className={`w-5 h-5 ${notif.type?.includes('reschedule') ? 'text-orange-400' : 'text-yellow-400'}`} />
                        ) : notif.type?.includes('en_route') ? (
                          <MapPin className="w-5 h-5 text-green-400" />
                        ) : notif.type?.includes('completion') ? (
                          <Clock className="w-5 h-5 text-blue-400" />
                        ) : notif.type?.includes('contract') ? (
                          <FileText className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Bell className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-white font-semibold">{notif.title}</p>
                          {!notif.read && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">New</span>
                          )}
                        </div>
                        <p className="text-white/70 text-sm mt-1">{notif.message}</p>
                        <p className="text-white/40 text-xs mt-2">
                          {notif.created_at && new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscription Section */}
          {subscription && (
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-green-400" />
                My Subscription
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Status</p>
                  <p className="text-green-400 font-bold">Active</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Days per Month</p>
                  <p className="text-white font-semibold">{subscription.service_days_per_month || 2}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Monthly Total</p>
                  <p className="text-white font-semibold">${subscription.total?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-white/60 text-sm">Service Days</p>
                <p className="text-white">{(subscription.monthly_service_days || []).join(', ') || 'Not scheduled'}</p>
              </div>
            </div>
          )}

          {/* Pending Contracts to Sign */}
          {pendingContracts.length > 0 && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Bell className="text-yellow-400" />
                Contracts Awaiting Your Signature
              </h2>
              <div className="space-y-3">
                {pendingContracts.map((contract) => (
                  <div key={contract.id} className="bg-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <p className="text-white font-semibold">{contract.frequency} Service Contract</p>
                        <p className="text-white/60 text-sm">Sent on {new Date(contract.sent_at).toLocaleDateString()}</p>
                        <p className="text-green-400 text-sm font-medium">${contract.price_per_service?.toFixed(2) || '0.00'} per service</p>
                      </div>
                      <button
                        onClick={() => openSigningModal(contract)}
                        className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 flex items-center gap-2"
                      >
                        <FileText className="w-5 h-5" />
                        Review & Sign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts Section */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="text-purple-400" />
              My Contracts
            </h2>
            {contracts.length === 0 ? (
              <p className="text-white/60">No contracts on file</p>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <p className="text-white font-semibold">{contract.frequency} Service Contract</p>
                        <p className="text-white/60 text-sm">
                          {contract.status === 'signed' 
                            ? `Signed on ${new Date(contract.signed_at).toLocaleDateString()}` 
                            : `Sent on ${new Date(contract.sent_at).toLocaleDateString()}`}
                        </p>
                        {contract.price_per_service && (
                          <p className="text-green-400 text-sm">${contract.price_per_service.toFixed(2)} per service</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        contract.status === 'signed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {contract.status === 'signed' ? '✓ Signed' : 'Pending'}
                      </span>
                    </div>
                    {contract.signature_data && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/40 text-xs mb-2">Your Signature:</p>
                        <img 
                          src={`${API_URL}${contract.signature_data}`} 
                          alt="Signature" 
                          className="h-12 bg-white rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Contract Signing Modal */}
      {signingContract && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Service Agreement Contract</h2>
                <button 
                  onClick={() => setSigningContract(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Contract Details */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Service Type</p>
                    <p className="text-white font-medium">{signingContract.frequency}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Price Per Service</p>
                    <p className="text-green-400 font-medium">${signingContract.price_per_service?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Contract Terms */}
              <div className="bg-white/5 rounded-xl p-4 max-h-48 overflow-y-auto">
                <h3 className="text-white font-medium mb-2">Terms & Conditions</h3>
                <pre className="text-white/70 text-sm whitespace-pre-wrap font-sans">
                  {signingContract.terms}
                </pre>
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded"
                />
                <span className="text-white text-sm">
                  I have read and agree to the terms and conditions of this service agreement. 
                  I understand that my digital signature below is legally binding.
                </span>
              </label>

              {/* Signature Pad */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-white font-medium">Sign Below</p>
                  <button 
                    onClick={clearSignature}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="bg-white rounded-xl overflow-hidden border-2 border-white/20">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair touch-none"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">Draw your signature using mouse or touch</p>
              </div>

              {/* Submit Button */}
              <button
                onClick={submitSignature}
                disabled={!agreedTerms || submitting}
                className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Sign Contract
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
