import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, MapPin, CheckCircle, MessageSquare, 
  LogOut, Menu, X, Navigation, Camera, AlertTriangle,
  Phone, Clock, DollarSign, Users, ShoppingCart, ChevronRight,
  Send, Route as RouteIcon, Bell, BellRing, Wallet, XCircle, Upload, Car
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_API_KEY = 'AIzaSyB2vTg8-1CZ28q-bpxk9oOh48rCG2mLKEg';
const TAX_RATE = 0.0825;
const PAY_PER_STOP = 11.0;

// Bible Verses
const BIBLE_VERSES = [
  { verse: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { verse: "Trust in the LORD with all your heart.", reference: "Proverbs 3:5" },
  { verse: "The LORD is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { verse: "Be strong and courageous. Do not be afraid.", reference: "Joshua 1:9" },
  { verse: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { verse: "The joy of the LORD is your strength.", reference: "Nehemiah 8:10" },
  { verse: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { verse: "God is our refuge and strength, an ever-present help in trouble.", reference: "Psalm 46:1" },
  { verse: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { verse: "For I know the plans I have for you, declares the LORD.", reference: "Jeremiah 29:11" }
];

// Cross Icon
const CrossIcon = ({ className, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6V2z"/>
  </svg>
);

// Notification sound
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Xj4F1cXV9iJSgn5aLfnJucX2IlZ6dloyAc29weoeSm5uUjYF2c3V8hpGZmZSNg3d0dXuFj5eXko2Bd3R2fIaQl5aRjIF3dHZ9hpCWlZCLgHZ0dn6Hj5WUj4qAdnR3foeOk5KNiYB2dHd+ho2SkIuIf3Z0d36GjJCOioZ+dnR4fYaLjo2IhX12dHh+hYqMi4aDfHZ0eH6EiYqJhIJ7dnV4foSIiYeEgXp2dXl+g4eHhoOAeXZ1eX6Ch4aFgn94dnV5fYKGhYOBfnd2dXl9gYSEgoB9d3V2eX2BhIOBf3x3dXZ5fYCDgYB+e3d1dnl9gIKAgH17d3V2enmAgIB/fHp3dXZ6eX9/f357eXd2dnp5fn5+fXx6eHd3d3p5fX19fHt5eHd3d3p5fHx8e3p5eHd4eHp5fHt7enl4eHh4eXl7e3t6eXl4eHh4eXp6enp5eXh4eHl5enp5eXl5eHh4eXl5eXl5eXl4eHh5eXl5eXl5eHh4eHl5eXl5eXh4eHh4eXl5eXl5eHh4eHh5eXl5eXl4eHh4eHh4eXl5eXl4eHh4eHh4eHl5eXh4eHh4eHh4eHh5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eA==";

// Auth helper
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Sidebar Navigation
const navItems = [
  { path: '', icon: LayoutDashboard, label: "Today's Route" },
  { path: 'routes', icon: RouteIcon, label: 'My Routes' },
  { path: 'earnings', icon: Wallet, label: 'Earnings' },
  { path: 'request-routes', icon: ShoppingCart, label: 'Request Routes' },
  { path: 'notifications', icon: Bell, label: 'Notifications' },
  { path: 'chat', icon: MessageSquare, label: 'Messages' },
  { path: 'team', icon: Users, label: 'Team' },
];

// Contractor Earnings Dashboard
function EarningsDashboard() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/earnings`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEarnings(data);
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const payPerStop = earnings?.pay_per_stop || 11;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Wallet className="text-green-400" />
        My Earnings
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/30">
          <p className="text-green-400 text-sm">This Week</p>
          <p className="text-3xl font-bold text-white">${(earnings?.this_week_earnings || 0).toFixed(2)}</p>
          <p className="text-white/60 text-sm">{earnings?.this_week_stops || 0} stops</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-6 border border-blue-500/30">
          <p className="text-blue-400 text-sm">Total Earnings</p>
          <p className="text-3xl font-bold text-white">${(earnings?.total_earnings || 0).toFixed(2)}</p>
          <p className="text-white/60 text-sm">{earnings?.total_completed_stops || 0} stops</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
          <p className="text-purple-400 text-sm">Total Paid</p>
          <p className="text-3xl font-bold text-white">${(earnings?.total_paid || 0).toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-6 border ${
          (earnings?.unpaid_balance || 0) > 0 
            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
            : 'bg-white/5 border-white/20'
        }`}>
          <p className={`text-sm ${(earnings?.unpaid_balance || 0) > 0 ? 'text-yellow-400' : 'text-white/60'}`}>
            Unpaid Balance
          </p>
          <p className="text-3xl font-bold text-white">${(earnings?.unpaid_balance || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Pay Rate Info */}
      <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">Pay Rate</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/60">Per Completed Stop</p>
            <p className="text-2xl font-bold text-green-400">${payPerStop.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/60">CNS Stops (No Pay)</p>
            <p className="text-2xl font-bold text-red-400">{earnings?.total_cns_stops || 0} stops</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      {earnings?.recent_payments?.length > 0 && (
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">Payment History</h3>
          <div className="space-y-3">
            {earnings.recent_payments.map((payment, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                <div>
                  <p className="text-white font-semibold">${payment.amount.toFixed(2)}</p>
                  <p className="text-white/60 text-sm">{payment.payment_method}</p>
                </div>
                <p className="text-white/60 text-sm">{new Date(payment.paid_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Today's Route / Tasks with Complete/CNS buttons
function TodayRoute() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCNSModal, setShowCNSModal] = useState(false);
  const [cnsReason, setCnsReason] = useState('');
  const [cnsPhoto, setCnsPhoto] = useState(null);
  const [cnsPhotoPreview, setCnsPhotoPreview] = useState(null);
  const [processingStop, setProcessingStop] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const fetchTodayTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/today`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTasks(data.bookings || []);
    } catch (err) {
      toast.error('Failed to load today\'s tasks');
    } finally {
      setLoading(false);
    }
  };

  const completeStop = async (bookingId, status) => {
    setProcessingStop(bookingId);
    try {
      const res = await fetch(`${API_URL}/api/contractor/stop/${bookingId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'completed' })
      });
      if (!res.ok) throw new Error('Failed to complete');
      const data = await res.json();
      toast.success(`Stop completed! +$${data.pay_amount?.toFixed(2) || PAY_PER_STOP.toFixed(2)}`);
      fetchTodayTasks();
    } catch (err) {
      toast.error('Failed to complete stop');
    } finally {
      setProcessingStop(null);
    }
  };

  const submitCNS = async () => {
    if (!selectedTask || cnsReason.length < 10 || !cnsPhoto) {
      toast.error('Description and photo are required for CNS');
      return;
    }

    try {
      // Upload photo to server storage
      const reader = new FileReader();
      reader.readAsDataURL(cnsPhoto);
      
      reader.onload = async () => {
        try {
          // Upload photo first
          const uploadRes = await fetch(`${API_URL}/api/upload/photo-base64`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              data: reader.result,
              type: 'cns'
            })
          });
          
          if (!uploadRes.ok) throw new Error('Failed to upload photo');
          const uploadData = await uploadRes.json();
          
          // Now submit CNS with the uploaded photo URL
          const res = await fetch(`${API_URL}/api/contractor/stop/${selectedTask.id}/complete`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              status: 'cns',
              notes: cnsReason,
              photo_url: uploadData.photo_url
            })
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Failed to submit CNS');
          }
          
          toast.success('Stop marked as CNS (Cannot Service)');
          setShowCNSModal(false);
          setSelectedTask(null);
          setCnsReason('');
          setCnsPhoto(null);
          setCnsPhotoPreview(null);
          fetchTodayTasks();
        } catch (err) {
          toast.error(err.message || 'Failed to submit CNS');
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read photo');
      };
    } catch (err) {
      toast.error(err.message || 'Failed to submit CNS');
    }
  };

  const completeTask = async (bookingId) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/task/${bookingId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ booking_id: bookingId, completed: true })
      });
      if (!res.ok) throw new Error('Failed to complete');
      toast.success('Task marked as complete!');
      fetchTodayTasks();
    } catch (err) {
      toast.error('Failed to complete task');
    }
  };

  const markUnableToComplete = async () => {
    if (!cnsReason) {
      toast.error('Please provide a reason');
      return;
    }
    if (!cnsPhoto) {
      toast.error('Please take a photo');
      return;
    }

    try {
      // In a real app, upload photo to cloud storage first
      const photoUrl = URL.createObjectURL(cnsPhoto);
      
      const res = await fetch(`${API_URL}/api/contractor/task/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          booking_id: selectedTask.id,
          completed: false,
          unable_to_complete: true,
          reason: cnsReason,
          photo_url: photoUrl
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Task marked as unable to complete');
      setShowCNSModal(false);
      setSelectedTask(null);
      setCnsReason('');
      setCnsPhoto(null);
      fetchTodayTasks();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const openNavigation = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const sendEnRouteNotification = async (task) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/sms/en-route/${task.id}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`En-route notification sent to ${task.customer_name}!`);
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const sendCompletionNotification = async (task) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/sms/completed/${task.id}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Completion notification sent to ${task.customer_name}!`);
    } catch (err) {
      toast.error('Failed to send notification');
    }
  };

  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsTask, setSmsTask] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');

  const openSMSModal = (task) => {
    setSmsTask(task);
    setSmsMessage('');
    setShowSMSModal(true);
  };

  const sendDirectSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/contractor/sms/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          phone: smsTask.customer_phone,
          message: smsMessage,
          booking_id: smsTask.id
        })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Message sent!');
      setShowSMSModal(false);
      setSmsTask(null);
      setSmsMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Today's Route</h1>
        <span className="text-emerald-400 font-semibold">{tasks.length} stops</span>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <MapPin className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No tasks scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white/10 backdrop-blur rounded-2xl border border-white/20 overflow-hidden ${
                task.task_status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{task.customer_name}</h3>
                      <p className="text-white/60 text-sm">{task.customer_phone}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.task_status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    task.task_status === 'unable_to_complete' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {task.task_status === 'completed' ? 'Complete' :
                     task.task_status === 'unable_to_complete' ? 'Unable' : 'Pending'}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 mb-3">
                  <p className="text-white/80 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    {task.customer_address}
                  </p>
                </div>

                <p className="text-white/60 text-sm mb-4">
                  Services: {task.services?.map(s => s.service_id).join(', ')}
                </p>

                {task.task_status !== 'completed' && task.task_status !== 'unable_to_complete' && task.stop_status !== 'completed' && task.stop_status !== 'cns' && (
                  <div className="space-y-2">
                    {/* SMS Quick Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendEnRouteNotification(task)}
                        className="flex-1 py-2 bg-teal-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-teal-600 text-sm"
                        data-testid={`enroute-sms-${task.id}`}
                      >
                        <Car className="w-4 h-4" />
                        En Route SMS
                      </button>
                      <button
                        onClick={() => openSMSModal(task)}
                        className="flex-1 py-2 bg-purple-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600 text-sm"
                        data-testid={`direct-sms-${task.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Text Customer
                      </button>
                    </div>
                    {/* Main Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openNavigation(task.customer_address)}
                        className="flex-1 min-w-[140px] py-2 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600"
                        data-testid={`navigate-${task.id}`}
                      >
                        <Navigation className="w-4 h-4" />
                        Navigate
                      </button>
                      <a
                        href={`tel:${task.customer_phone}`}
                        className="flex-1 min-w-[140px] py-2 bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <button
                        onClick={() => completeStop(task.id, 'completed')}
                        disabled={processingStop === task.id}
                        className="flex-1 min-w-[140px] py-3 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 font-bold text-lg disabled:opacity-50"
                        data-testid={`complete-${task.id}`}
                      >
                        <CheckCircle className="w-5 h-5" />
                        COMPLETE
                      </button>
                      <button
                        onClick={() => { setSelectedTask(task); setShowCNSModal(true); }}
                        className="flex-1 min-w-[140px] py-3 bg-red-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 font-bold text-lg"
                        data-testid={`cns-${task.id}`}
                      >
                        <XCircle className="w-5 h-5" />
                        CNS
                      </button>
                    </div>
                  </div>
                )}

                {/* Show earnings for completed stops */}
                {(task.task_status === 'completed' || task.stop_status === 'completed') && (
                  <div className="space-y-2">
                    <div className="bg-green-500/20 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Completed
                      </span>
                      <span className="text-green-400 font-bold">+${PAY_PER_STOP.toFixed(2)}</span>
                    </div>
                    {!task.completion_notified && (
                      <button
                        onClick={() => sendCompletionNotification(task)}
                        className="w-full py-2 bg-teal-500/50 text-teal-300 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-500/70"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Send Completion SMS
                      </button>
                    )}
                  </div>
                )}

                {/* Show CNS status */}
                {(task.task_status === 'unable_to_complete' || task.stop_status === 'cns') && (
                  <div className="bg-red-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 flex items-center gap-2">
                        <XCircle className="w-5 h-5" /> CNS (Cannot Service)
                      </span>
                      <span className="text-red-400 font-bold">$0.00</span>
                    </div>
                    {task.stop_notes && (
                      <p className="text-white/60 text-sm mt-2">Reason: {task.stop_notes}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CNS (Cannot Service) Modal */}
      {showCNSModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowCNSModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">CNS - Cannot Service</h2>
                <p className="text-red-400 text-sm">No pay without description & photo!</p>
              </div>
            </div>

            <p className="text-white/60 mb-4">
              Customer: <span className="text-white">{selectedTask?.customer_name}</span>
            </p>

            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">
                <strong>⚠️ Important:</strong> You must provide a detailed description AND upload a photo to mark this stop as CNS. 
                Without both, you will NOT receive pay for this stop.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 mb-2">Description of Failed Service *</label>
                <textarea
                  value={cnsReason}
                  onChange={(e) => setCnsReason(e.target.value)}
                  placeholder="Explain in detail why the service could not be completed (minimum 10 characters)..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 h-32"
                  data-testid="cns-reason"
                />
                <p className="text-white/40 text-xs mt-1">{cnsReason.length}/10 characters minimum</p>
              </div>

              <div>
                <label className="block text-white/60 mb-2">Photo Upload * (Required)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setCnsPhoto(file);
                    if (file) {
                      setCnsPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-white flex items-center justify-center gap-2 hover:bg-white/20"
                  data-testid="take-photo-btn"
                >
                  <Camera className="w-5 h-5" />
                  {cnsPhoto ? 'Change Photo' : 'Take Photo / Upload'}
                </button>
                {cnsPhotoPreview && (
                  <div className="mt-3">
                    <img src={cnsPhotoPreview} alt="CNS Photo" className="w-full h-40 object-cover rounded-xl" />
                    <p className="text-green-400 text-sm mt-1">✓ Photo ready to upload</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCNSModal(false);
                    setCnsReason('');
                    setCnsPhoto(null);
                    setCnsPhotoPreview(null);
                  }}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitCNS()}
                  disabled={cnsReason.length < 10 || !cnsPhoto}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  data-testid="submit-cns-btn"
                >
                  Submit CNS
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Direct SMS Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowSMSModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-8 h-8 text-teal-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Text Customer</h2>
                <p className="text-white/60 text-sm">{smsTask?.customer_name}</p>
              </div>
            </div>

            <p className="text-white/60 mb-4">
              Phone: <span className="text-white">{smsTask?.customer_phone}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 mb-2">Message</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message to the customer..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 h-32"
                />
              </div>

              {/* Quick Messages */}
              <div className="space-y-2">
                <p className="text-white/40 text-xs">Quick messages:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSmsMessage(`Hi ${smsTask?.customer_name}! I'm on my way to your location and will arrive shortly.`)}
                    className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70 hover:bg-white/20"
                  >
                    On my way
                  </button>
                  <button
                    onClick={() => setSmsMessage(`Hi ${smsTask?.customer_name}! I've arrived at your location.`)}
                    className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70 hover:bg-white/20"
                  >
                    Arrived
                  </button>
                  <button
                    onClick={() => setSmsMessage(`Hi ${smsTask?.customer_name}! I'm running about 15 minutes late. Apologies for the delay!`)}
                    className="text-xs px-3 py-1 bg-white/10 rounded-full text-white/70 hover:bg-white/20"
                  >
                    Running late
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSMSModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={sendDirectSMS}
                  disabled={!smsMessage.trim()}
                  className="flex-1 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// My Routes
function MyRoutes() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releaseModal, setReleaseModal] = useState(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState([]);

  useEffect(() => {
    fetchRoutes();
    fetchAvailableRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/routes`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRoutes(data.routes || []);
    } catch (err) {
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/available-routes`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setAvailableRoutes(data.available_routes || []);
    } catch (err) {
      console.error('Failed to load available routes');
    }
  };

  const releaseRoute = async () => {
    if (!releaseModal) return;
    
    try {
      const res = await fetch(`${API_URL}/api/contractor/routes/${releaseModal.id}/release`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: releaseReason })
      });
      if (!res.ok) throw new Error('Failed to release');
      const data = await res.json();
      toast.success(`Route released! ${data.num_stops} stops returned to admin.`);
      setReleaseModal(null);
      setReleaseReason('');
      fetchRoutes();
    } catch (err) {
      toast.error('Failed to release route');
    }
  };

  const claimRoute = async (releasedRouteId) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/released-routes/${releasedRouteId}/claim`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to claim');
      const data = await res.json();
      toast.success(`Route claimed! You'll earn $${data.your_pay?.toFixed(2)}`);
      fetchRoutes();
      fetchAvailableRoutes();
    } catch (err) {
      toast.error('Failed to claim route');
    }
  };

  const acceptRoute = async (releasedRouteId) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/released-routes/${releasedRouteId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to accept');
      }
      toast.success('Route acceptance sent to admin for approval!');
      fetchAvailableRoutes();
    } catch (err) {
      toast.error(err.message || 'Failed to accept route');
    }
  };

  const declineRoute = async (releasedRouteId) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/released-routes/${releasedRouteId}/decline`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to decline');
      toast.success('Route declined');
      fetchAvailableRoutes();
    } catch (err) {
      toast.error('Failed to decline route');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <RouteIcon className="text-emerald-400" />
        My Routes
      </h1>

      {routes.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">You don't have any routes assigned yet</p>
          <Link to="/contractor/dashboard/purchase" className="text-emerald-400 hover:underline mt-2 inline-block">
            Purchase a route →
          </Link>
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
                  <p className="text-emerald-400 mt-2">{route.bookings?.length || 0} clients</p>
                  <p className="text-green-400 text-sm mt-1">
                    Potential earnings: ${((route.bookings?.length || 0) * 10).toFixed(2)} ($10/stop)
                  </p>
                </div>
                <button
                  onClick={() => setReleaseModal(route)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Release Route
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Routes from Admin */}
      {availableRoutes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
            <Bell className="text-yellow-400" />
            Routes Available to Claim
          </h2>
          <div className="space-y-4">
            {availableRoutes.map((route) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-yellow-500/20 to-green-500/20 backdrop-blur rounded-2xl p-6 border border-yellow-500/30"
              >
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{route.route_name}</h3>
                    <p className="text-white/60">Area: {route.route_area || 'Not specified'}</p>
                    <div className="flex gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-400">{route.num_stops}</p>
                        <p className="text-white/60 text-sm">Stops</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">${route.contractor_pay?.toFixed(2)}</p>
                        <p className="text-white/60 text-sm">Your Earnings</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-400">FREE</p>
                        <p className="text-white/60 text-sm">No Charge</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRoute(route.id)}
                      className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold flex items-center gap-2"
                      data-testid={`accept-route-${route.id}`}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept
                    </button>
                    <button
                      onClick={() => declineRoute(route.id)}
                      className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 font-semibold flex items-center gap-2"
                      data-testid={`decline-route-${route.id}`}
                    >
                      <X className="w-5 h-5" />
                      Decline
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Release Route Modal */}
      {releaseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setReleaseModal(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Release Route</h2>
              <p className="text-white/60 mt-2">
                Release <strong>{releaseModal.name}</strong> back to admin?
              </p>
              <p className="text-white/60 text-sm mt-1">
                This route has {releaseModal.bookings?.length || 0} stops (${((releaseModal.bookings?.length || 0) * 10).toFixed(2)} potential earnings)
              </p>
            </div>
            
            <div className="mb-6">
              <label className="text-white/60 text-sm">Reason for release (optional)</label>
              <textarea
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="Why are you releasing this route?"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white min-h-[80px]"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setReleaseModal(null)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={releaseRoute}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                Release Route
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Request Routes (renamed from Purchase Routes)
function RequestRoutes() {
  const [zipCodes, setZipCodes] = useState(['']);
  const [numRoutes, setNumRoutes] = useState('1');
  const [truckRental, setTruckRental] = useState(null);
  const [truckPrices, setTruckPrices] = useState({ small: 75, large: 125 });
  const [activeRentals, setActiveRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [payPerStop, setPayPerStop] = useState(11);

  useEffect(() => {
    fetchMyRequests();
    fetchTruckPrices();
    fetchPayRate();
  }, []);

  const fetchPayRate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/earnings`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPayPerStop(data.pay_per_stop || 11);
      }
    } catch (err) {
      console.error('Failed to load pay rate');
    }
  };

  const fetchTruckPrices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/truck-rentals`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTruckPrices(data.prices || { small: 75, large: 125 });
        setActiveRentals(data.active_rentals || []);
      }
    } catch (err) {
      console.error('Failed to load truck prices');
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/route-requests`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests');
    }
  };

  const addZipCode = () => {
    setZipCodes([...zipCodes, '']);
  };

  const removeZipCode = (index) => {
    if (zipCodes.length > 1) {
      setZipCodes(zipCodes.filter((_, i) => i !== index));
    }
  };

  const updateZipCode = (index, value) => {
    const updated = [...zipCodes];
    updated[index] = value;
    setZipCodes(updated);
  };

  const rentTruck = async (truckType) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/truck-rentals?truck_type=${truckType}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${truckType.charAt(0).toUpperCase() + truckType.slice(1)} truck rented!`);
      fetchTruckPrices();
    } catch (err) {
      toast.error('Failed to rent truck');
    }
  };

  const cancelRental = async (rentalId) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/truck-rentals/${rentalId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Truck rental cancelled');
      fetchTruckPrices();
    } catch (err) {
      toast.error('Failed to cancel rental');
    }
  };

  const submitRequest = async () => {
    const validZipCodes = zipCodes.filter(z => z.trim().length === 5);
    if (validZipCodes.length === 0) {
      toast.error('Please enter at least one valid zip code');
      return;
    }

    const routeCount = parseInt(numRoutes) || 1;
    if (routeCount < 1 || routeCount > 100) {
      toast.error('Please enter a valid number of routes (1-100)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/contractor/route-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          zip_codes: validZipCodes,
          num_routes: routeCount,
          truck_rental: truckRental
        })
      });
      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      let successMsg = 'Route request submitted! Admin will review and approve.';
      if (data.truck_rental_cost > 0) {
        successMsg += ` Truck rental: $${data.truck_rental_cost}/week`;
      }
      toast.success(successMsg);
      setZipCodes(['']);
      setNumRoutes('1');
      setTruckRental(null);
      fetchMyRequests();
    } catch (err) {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <ShoppingCart className="text-yellow-400" />
        Request Routes
      </h1>

      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-6">
        <p className="text-yellow-200">
          Request routes by zip code. Admin will approve and charge you <strong>${payPerStop.toFixed(2)} per stop</strong> in the route.
        </p>
      </div>

      {/* Truck Rental Section */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Car className="text-blue-400" />
          Truck Rental
        </h3>
        
        {activeRentals.length > 0 && (
          <div className="mb-4 p-4 bg-green-500/20 rounded-xl">
            <p className="text-green-400 font-semibold mb-2">Active Rentals:</p>
            {activeRentals.map((rental) => (
              <div key={rental.id} className="flex justify-between items-center">
                <span className="text-white">{rental.truck_type.charAt(0).toUpperCase() + rental.truck_type.slice(1)} Truck - ${rental.weekly_cost}/week</span>
                <button
                  onClick={() => cancelRental(rental.id)}
                  className="text-red-400 text-sm hover:underline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <h4 className="text-white font-semibold">Small Truck</h4>
            <p className="text-3xl font-bold text-green-400 my-2">${truckPrices.small}</p>
            <p className="text-white/60 text-sm">/week</p>
            <button
              onClick={() => rentTruck('small')}
              className="mt-3 w-full py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            >
              Rent Small Truck
            </button>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <h4 className="text-white font-semibold">Large Truck</h4>
            <p className="text-3xl font-bold text-green-400 my-2">${truckPrices.large}</p>
            <p className="text-white/60 text-sm">/week</p>
            <button
              onClick={() => rentTruck('large')}
              className="mt-3 w-full py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600"
            >
              Rent Large Truck
            </button>
          </div>
        </div>
      </div>

      {/* Request Form */}
      <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-bold text-white mb-4">New Route Request</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-2 block">Zip Codes</label>
            {zipCodes.map((zip, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => updateZipCode(index, e.target.value)}
                  placeholder="Enter zip code"
                  maxLength={5}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                />
                {zipCodes.length > 1 && (
                  <button
                    onClick={() => removeZipCode(index)}
                    className="px-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addZipCode}
              className="text-emerald-400 text-sm hover:underline"
            >
              + Add another zip code
            </button>
          </div>

          <div>
            <label className="text-white/60 text-sm mb-2 block">Number of Routes</label>
            <input
              type="number"
              min="1"
              max="100"
              value={numRoutes}
              onChange={(e) => setNumRoutes(e.target.value)}
              placeholder="Enter number of routes"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
            />
            <p className="text-white/40 text-xs mt-1">Enter the number of routes you want to request</p>
          </div>

          {/* Optional truck rental with request */}
          <div>
            <label className="text-white/60 text-sm mb-2 block">Include Truck Rental (Optional)</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTruckRental(truckRental === 'small' ? null : 'small')}
                className={`flex-1 py-3 rounded-xl ${truckRental === 'small' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                Small (${truckPrices.small}/wk)
              </button>
              <button
                onClick={() => setTruckRental(truckRental === 'large' ? null : 'large')}
                className={`flex-1 py-3 rounded-xl ${truckRental === 'large' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}`}
              >
                Large (${truckPrices.large}/wk)
              </button>
            </div>
          </div>

          <button
            onClick={submitRequest}
            disabled={loading}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>

      {/* My Requests */}
      {myRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">My Requests</h3>
          {myRequests.map((request) => (
            <div key={request.id} className={`bg-white/10 backdrop-blur rounded-2xl p-4 border ${
              request.status === 'pending' ? 'border-yellow-500/30' :
              request.status === 'approved' ? 'border-green-500/30' : 'border-red-500/30'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">Zip Codes: {request.zip_codes?.join(', ')}</p>
                  <p className="text-white/60 text-sm">{request.num_routes_requested} route(s) requested</p>
                  {request.truck_rental && (
                    <p className="text-blue-400 text-sm">+ {request.truck_rental} truck (${request.truck_rental_cost}/wk)</p>
                  )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {request.status}
                </div>
              </div>
              {request.status === 'approved' && (
                <p className="text-green-400 text-sm mt-2">
                  ✓ {request.total_stops || 0} stops assigned - Charged ${request.charge_amount?.toFixed(2) || 0}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chat / Messages
function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [chatTarget, setChatTarget] = useState({ type: 'admin', id: null }); // admin, contractor, group

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch messages
      const msgRes = await fetch(`${API_URL}/api/chat/messages`, { headers: getAuthHeaders() });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }

      // Fetch nearby contractors
      const contRes = await fetch(`${API_URL}/api/contractor/nearby`, { headers: getAuthHeaders() });
      if (contRes.ok) {
        const contData = await contRes.json();
        setContractors(contData.contractors || []);
      }

      // Fetch groups
      const groupRes = await fetch(`${API_URL}/api/chat/groups`, { headers: getAuthHeaders() });
      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroups(groupData.groups || []);
      }
    } catch (err) {
      console.error('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const body = {
        content: newMessage,
        is_group: chatTarget.type === 'group'
      };

      if (chatTarget.type === 'contractor') {
        body.recipient_id = chatTarget.id;
      } else if (chatTarget.type === 'group') {
        body.group_id = chatTarget.id;
      }
      // admin chat has no recipient_id

      const res = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error('Failed to send');
      setNewMessage('');
      fetchData();
      toast.success('Message sent!');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const createGroup = async () => {
    const name = prompt('Enter group name:');
    if (!name) return;

    const memberIds = contractors.map(c => c.id);
    
    try {
      const res = await fetch(`${API_URL}/api/chat/groups?name=${name}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(memberIds)
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success('Group created!');
      fetchData();
    } catch (err) {
      toast.error('Failed to create group');
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
        {/* Chat Target Selection */}
        <div className="space-y-4">
          {/* Admin Chat */}
          <div className="bg-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3">Admin</h3>
            <button
              onClick={() => setChatTarget({ type: 'admin', id: null })}
              className={`w-full text-left p-3 rounded-xl transition ${
                chatTarget.type === 'admin' ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <span className="text-white">Chat with Admin</span>
            </button>
          </div>

          {/* Other Contractors */}
          <div className="bg-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3">Contractors</h3>
            <div className="space-y-2">
              {contractors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setChatTarget({ type: 'contractor', id: c.id })}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    chatTarget.type === 'contractor' && chatTarget.id === c.id 
                      ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-white">{c.full_name}</span>
                  {c.last_location && (
                    <p className="text-white/60 text-xs">
                      {/* Distance calculation would go here */}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div className="bg-white/10 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold">Groups</h3>
              <button onClick={createGroup} className="text-teal-400 text-sm hover:underline">
                + New
              </button>
            </div>
            <div className="space-y-2">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setChatTarget({ type: 'group', id: g.id })}
                  className={`w-full text-left p-3 rounded-xl transition ${
                    chatTarget.type === 'group' && chatTarget.id === g.id 
                      ? 'bg-teal-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-white">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="md:col-span-2 bg-white/10 rounded-2xl p-4 flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.length === 0 ? (
              <p className="text-white/60 text-center py-8">No messages yet</p>
            ) : (
              messages.map((msg, i) => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={i} className={`p-3 rounded-xl ${isMe ? 'bg-teal-500/30 ml-8' : 'bg-white/10 mr-8'}`}>
                    <p className="text-white/60 text-xs mb-1">{msg.sender_name}</p>
                    <p className="text-white">{msg.content}</p>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${chatTarget.type === 'admin' ? 'Admin' : chatTarget.type}...`}
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

// Team / Nearby Contractors
function TeamPage() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationRequests, setLocationRequests] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [requestingLocation, setRequestingLocation] = useState(null);

  useEffect(() => {
    fetchNearbyContractors();
    fetchLocationRequests();
    startLocationSharing();
    
    // Poll for updates
    const interval = setInterval(() => {
      fetchNearbyContractors();
      fetchLocationRequests();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const startLocationSharing = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        async (position) => {
          setMyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          try {
            await fetch(`${API_URL}/api/contractor/location?lat=${position.coords.latitude}&lng=${position.coords.longitude}`, {
              method: 'POST',
              headers: getAuthHeaders()
            });
          } catch (err) {
            console.error('Failed to update location');
          }
        },
        (err) => console.error('Location error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const fetchNearbyContractors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/nearby`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContractors(data.contractors || []);
      if (data.my_location) setMyLocation(data.my_location);
    } catch (err) {
      console.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/location-requests`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setLocationRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load location requests');
    }
  };

  const requestLocation = async (contractorId) => {
    setRequestingLocation(contractorId);
    try {
      const res = await fetch(`${API_URL}/api/contractor/request-location/${contractorId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Location request sent!');
    } catch (err) {
      toast.error('Failed to request location');
    } finally {
      setRequestingLocation(null);
    }
  };

  const respondToRequest = async (requestId, approve) => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/location-request/${requestId}/respond?approve=${approve}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(approve ? 'Location shared!' : 'Request denied');
      fetchLocationRequests();
    } catch (err) {
      toast.error('Failed to respond to request');
    }
  };

  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Users className="text-blue-400" />
        Team - Nearby Contractors
      </h1>

      {/* Location Requests */}
      {locationRequests.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-4">
          <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Requests ({locationRequests.length})
          </h3>
          {locationRequests.map((req) => (
            <div key={req.id} className="bg-black/20 rounded-xl p-4 mb-2 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{req.requester_name}</p>
                <p className="text-white/60 text-sm">Requesting your exact location</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToRequest(req.id, true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                >
                  Share
                </button>
                <button
                  onClick={() => respondToRequest(req.id, false)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <p className="text-blue-200">
            Your location is being shared • {myLocation ? `${myLocation.lat.toFixed(4)}, ${myLocation.lng.toFixed(4)}` : 'Getting location...'}
          </p>
        </div>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No other contractors online</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {contractor.full_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{contractor.full_name || contractor.username}</h3>
                    <p className="text-white/60">{contractor.phone}</p>
                  </div>
                </div>
                
                {/* Distance Badge */}
                {contractor.distance_miles !== null && (
                  <div className="bg-teal-500/30 px-3 py-1 rounded-full">
                    <span className="text-teal-300 font-bold">{contractor.distance_miles} mi</span>
                  </div>
                )}
              </div>
              
              {/* Online Status */}
              {contractor.is_online ? (
                <div className="mt-3 flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm">Online</span>
                  {contractor.last_location && (
                    <span className="text-white/40 text-xs">
                      • Updated {new Date(contractor.last_location.updated_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-white/40">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-sm">Offline</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link
                  to={`/contractor/dashboard/chat`}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-xl text-center hover:bg-teal-600 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Link>
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-center hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
              
              {/* Location Actions */}
              <div className="mt-2 flex gap-2">
                {contractor.last_location ? (
                  <button
                    onClick={() => openInMaps(contractor.last_location.lat, contractor.last_location.lng)}
                    className="flex-1 py-2 bg-purple-500/50 text-white rounded-xl hover:bg-purple-500/70 flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Navigate
                  </button>
                ) : (
                  <button
                    onClick={() => requestLocation(contractor.id)}
                    disabled={requestingLocation === contractor.id}
                    className="flex-1 py-2 bg-orange-500/50 text-white rounded-xl hover:bg-orange-500/70 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4" />
                    {requestingLocation === contractor.id ? 'Requesting...' : 'Request Location'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Notifications Page
function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contractor/notifications`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/contractor/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/contractor/notifications/read-all`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Bell className="text-yellow-400" />
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl hover:bg-yellow-500/30"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <Bell className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white/10 backdrop-blur rounded-xl p-4 border ${
                notif.read ? 'border-white/10' : 'border-yellow-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.type === 'route_assigned' ? 'bg-green-500' :
                    notif.type === 'bookings_added' ? 'bg-blue-500' :
                    notif.type === 'broadcast' ? 'bg-purple-500' : 'bg-teal-500'
                  }`}>
                    {notif.type === 'route_assigned' ? <RouteIcon className="w-5 h-5 text-white" /> :
                     notif.type === 'bookings_added' ? <MapPin className="w-5 h-5 text-white" /> :
                     <BellRing className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{notif.title}</h3>
                    <p className="text-white/70">{notif.message}</p>
                    <p className="text-white/40 text-sm mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!notif.read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </motion.div>
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

// Main Contractor Dashboard
export default function ContractorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const lastNotificationIdRef = useRef(null);
  const audioRef = useRef(null);

  // Check for new notifications
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contractor/notifications`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const notifications = data.notifications || [];
        
        setUnreadNotifications(data.unread_count || 0);
        
        // Check for new notification
        if (notifications.length > 0) {
          const latest = notifications[0];
          if (!latest.read && latest.id !== lastNotificationIdRef.current) {
            lastNotificationIdRef.current = latest.id;
            setLatestNotification(latest);
            setShowNotificationPopup(true);
            playNotificationSound();
            showBrowserNotification(latest);
            setTimeout(() => setShowNotificationPopup(false), 6000);
          }
        }
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000); // Check every 10 seconds
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

  const showBrowserNotification = (notif) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notif.title, {
        body: notif.message,
        icon: '/favicon.ico',
        tag: 'upwash-contractor'
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/contractor/login');
      return;
    }

    const parsed = JSON.parse(userData);
    if (parsed.role !== 'contractor') {
      navigate('/contractor/login');
      return;
    }

    setUser(parsed);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/contractor/login');
  };

  if (!user) return null;

  const currentPath = location.pathname.replace('/contractor/dashboard/', '').replace('/contractor/dashboard', '');
  const currentVerse = BIBLE_VERSES[Math.floor(Date.now() / (15 * 60 * 1000)) % BIBLE_VERSES.length];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex flex-col">
      {/* Bible Verse Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-2 px-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-3">
          <CrossIcon className="text-white/80 flex-shrink-0" size={16} />
          <p className="text-white text-center text-sm">
            <span className="italic">"{currentVerse.verse}"</span>
            <span className="text-white/80 ml-2">— {currentVerse.reference}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Notification Popup */}
        <AnimatePresence>
          {showNotificationPopup && latestNotification && (
            <motion.div
              initial={{ opacity: 0, y: -100, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -100 }}
              className="fixed top-16 left-1/2 z-50 bg-yellow-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 cursor-pointer max-w-md"
              onClick={() => {
                setShowNotificationPopup(false);
                navigate('/contractor/dashboard/notifications');
              }}
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <BellRing className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{latestNotification.title}</p>
                <p className="text-white/90 text-sm">{latestNotification.message}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotificationPopup(false); }}
                className="text-white/60 hover:text-white"
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
            <div>
              <h1 className="text-xl font-bold text-white">Upwash</h1>
              <p className="text-emerald-400 text-sm">Hi, {user.full_name}</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isNotifications = item.path === 'notifications';
            
            return (
              <Link
                key={item.path}
                to={`/contractor/dashboard/${item.path}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition relative ${
                  currentPath === item.path 
                    ? 'bg-emerald-500 text-white' 
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isNotifications && unreadNotifications > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </div>
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && isNotifications && unreadNotifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    {unreadNotifications}
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
            data-testid="contractor-logout-btn"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TodayRoute />} />
          <Route path="routes" element={<MyRoutes />} />
          <Route path="earnings" element={<EarningsDashboard />} />
          <Route path="request-routes" element={<RequestRoutes />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="team" element={<TeamPage />} />
        </Routes>
      </main>
      </div>
    </div>
  );
}
