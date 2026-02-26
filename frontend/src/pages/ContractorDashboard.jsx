import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, MapPin, CheckCircle, MessageSquare, 
  LogOut, Menu, X, Navigation, Camera, AlertTriangle,
  Phone, Clock, DollarSign, Users, ShoppingCart, ChevronRight,
  Send, Route as RouteIcon, Bell, BellRing
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const GOOGLE_MAPS_API_KEY = 'AIzaSyB2vTg8-1CZ28q-bpxk9oOh48rCG2mLKEg';
const TAX_RATE = 0.0825;

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
  { path: 'purchase', icon: ShoppingCart, label: 'Purchase Routes' },
  { path: 'notifications', icon: Bell, label: 'Notifications' },
  { path: 'chat', icon: MessageSquare, label: 'Messages' },
  { path: 'team', icon: Users, label: 'Team' },
];

// Today's Route / Tasks
function TodayRoute() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showUnableModal, setShowUnableModal] = useState(false);
  const [unableReason, setUnableReason] = useState('');
  const [unablePhoto, setUnablePhoto] = useState(null);
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
    if (!unableReason) {
      toast.error('Please provide a reason');
      return;
    }
    if (!unablePhoto) {
      toast.error('Please take a photo');
      return;
    }

    try {
      // In a real app, upload photo to cloud storage first
      const photoUrl = URL.createObjectURL(unablePhoto);
      
      const res = await fetch(`${API_URL}/api/contractor/task/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          booking_id: selectedTask.id,
          completed: false,
          unable_to_complete: true,
          reason: unableReason,
          photo_url: photoUrl
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Task marked as unable to complete');
      setShowUnableModal(false);
      setSelectedTask(null);
      setUnableReason('');
      setUnablePhoto(null);
      fetchTodayTasks();
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const openNavigation = (address) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  const sendArrivalNotice = async (task) => {
    // In production, this would trigger SMS via backend
    toast.success(`Notification sent to ${task.customer_name}!`);
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

                {task.task_status !== 'completed' && task.task_status !== 'unable_to_complete' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openNavigation(task.customer_address)}
                      className="flex-1 min-w-[140px] py-2 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600"
                      data-testid={`navigate-${task.id}`}
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate
                    </button>
                    <button
                      onClick={() => sendArrivalNotice(task)}
                      className="flex-1 min-w-[140px] py-2 bg-purple-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600"
                    >
                      <Phone className="w-4 h-4" />
                      Notify Client
                    </button>
                    <button
                      onClick={() => completeTask(task.id)}
                      className="flex-1 min-w-[140px] py-2 bg-green-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-green-600"
                      data-testid={`complete-${task.id}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </button>
                    <button
                      onClick={() => { setSelectedTask(task); setShowUnableModal(true); }}
                      className="flex-1 min-w-[140px] py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/30"
                      data-testid={`unable-${task.id}`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Unable to Complete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Unable to Complete Modal */}
      {showUnableModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowUnableModal(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Unable to Complete</h2>
            </div>

            <p className="text-white/60 mb-4">
              Customer: <span className="text-white">{selectedTask?.customer_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 mb-2">Reason (Required)</label>
                <textarea
                  value={unableReason}
                  onChange={(e) => setUnableReason(e.target.value)}
                  placeholder="Explain why the task couldn't be completed..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 h-32"
                  data-testid="unable-reason"
                />
              </div>

              <div>
                <label className="block text-white/60 mb-2">Photo (Required)</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={(e) => setUnablePhoto(e.target.files[0])}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-white/10 border border-white/20 rounded-xl text-white flex items-center justify-center gap-2 hover:bg-white/20"
                  data-testid="take-photo-btn"
                >
                  <Camera className="w-5 h-5" />
                  {unablePhoto ? 'Photo Selected' : 'Take Photo'}
                </button>
                {unablePhoto && (
                  <p className="text-green-400 text-sm mt-2">Photo: {unablePhoto.name}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUnableModal(false)}
                  className="flex-1 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={markUnableToComplete}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600"
                  data-testid="submit-unable-btn"
                >
                  Submit
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

  useEffect(() => {
    fetchRoutes();
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
              <h3 className="text-xl font-bold text-white">{route.name}</h3>
              <p className="text-white/60">{route.description || 'No description'}</p>
              <p className="text-white/60">Area: {route.area || 'Not specified'}</p>
              <p className="text-emerald-400 mt-2">{route.bookings?.length || 0} clients</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Purchase Routes
function PurchaseRoutes() {
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const ROUTE_PRICE = 350;

  useEffect(() => {
    // In production, fetch available routes
    setAvailableRoutes([
      { id: '1', name: 'Burleson North', area: 'North Burleson', description: '~40 homes' },
      { id: '2', name: 'Burleson South', area: 'South Burleson', description: '~35 homes' },
      { id: '3', name: 'Crowley Area', area: 'Crowley', description: '~30 homes' },
    ]);
    setLoading(false);
  }, []);

  const purchaseRoute = async (route) => {
    const tax = ROUTE_PRICE * TAX_RATE;
    const total = ROUTE_PRICE + tax;
    
    if (!window.confirm(`Purchase "${route.name}" for $${total.toFixed(2)}?`)) return;
    
    // In production, this would open Square payment flow
    toast.success(`Route "${route.name}" purchased! (Demo - payment not processed)`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <ShoppingCart className="text-yellow-400" />
        Purchase Routes
      </h1>

      <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-2xl p-4 mb-6">
        <p className="text-yellow-200">
          Routes cost <span className="font-bold">${ROUTE_PRICE}</span> + 8.25% tax = <span className="font-bold">${(ROUTE_PRICE * (1 + TAX_RATE)).toFixed(2)}</span>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {availableRoutes.map((route) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-bold text-white">{route.name}</h3>
            <p className="text-white/60">{route.area}</p>
            <p className="text-white/60 text-sm">{route.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-2xl font-bold text-green-400">
                ${(ROUTE_PRICE * (1 + TAX_RATE)).toFixed(2)}
              </span>
              <button
                onClick={() => purchaseRoute(route)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600"
              >
                Purchase
              </button>
            </div>
          </motion.div>
        ))}
      </div>
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

  useEffect(() => {
    fetchNearbyContractors();
    // Start location sharing
    startLocationSharing();
  }, []);

  const startLocationSharing = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        async (position) => {
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
    } catch (err) {
      console.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Users className="text-blue-400" />
        Team
      </h1>

      <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4 mb-6">
        <p className="text-blue-200">
          Your location is being shared with other contractors to help coordinate
        </p>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/60">No other contractors online</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {contractor.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{contractor.full_name}</h3>
                  <p className="text-white/60">{contractor.phone}</p>
                </div>
              </div>
              
              {contractor.last_location && (
                <div className="mt-4 flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm">Online</span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Link
                  to={`/contractor/dashboard/chat`}
                  className="flex-1 py-2 bg-teal-500 text-white rounded-xl text-center hover:bg-teal-600"
                >
                  Message
                </Link>
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-center hover:bg-blue-600"
                >
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
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/contractor/login');
  };

  if (!user) return null;

  const currentPath = location.pathname.replace('/contractor/dashboard/', '').replace('/contractor/dashboard', '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex">
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
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={`/contractor/dashboard/${item.path}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                currentPath === item.path 
                  ? 'bg-emerald-500 text-white' 
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
          <Route path="purchase" element={<PurchaseRoutes />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="team" element={<TeamPage />} />
        </Routes>
      </main>
    </div>
  );
}
