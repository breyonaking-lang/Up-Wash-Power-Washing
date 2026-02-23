import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  CalendarDays, 
  DollarSign, 
  Users, 
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
    checkSmsStatus();
  }, []);

  const checkSmsStatus = async () => {
    try {
      const response = await axios.get(`${API}/sms/status`);
      setSmsConfigured(response.data.configured);
    } catch (error) {
      console.error("Error checking SMS status:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/bookings`)
      ]);

      setStats(statsRes.data);
      setBookings(bookingsRes.data.bookings || []);

      // Build calendar data - handle booking_dates array
      const calData = {};
      (bookingsRes.data.bookings || []).forEach(booking => {
        const dates = booking.booking_dates || [];
        // Handle legacy bookings with single booking_date
        const allDates = dates.length > 0 ? dates : (booking.booking_date ? [booking.booking_date] : []);
        
        allDates.forEach(date => {
          if (!calData[date]) {
            calData[date] = [];
          }
          calData[date].push(booking);
        });
      });
      setCalendarData(calData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (bookingId) => {
    try {
      await axios.post(`${API}/sms/send`, {
        booking_id: bookingId,
        message_type: "reminder"
      });
      toast.success("Reminder SMS sent!");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error(error.response?.data?.detail || "Failed to send reminder");
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await axios.patch(`${API}/bookings/${bookingId}/status?status=${newStatus}`);
      toast.success(`Booking ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update booking");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "confirmed": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700";
      case "unpaid": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hour] = time.split(":");
    const h = parseInt(hour);
    return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
  };

  const filteredBookings = statusFilter === "all" 
    ? bookings 
    : bookings.filter(b => b.status === statusFilter);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDateBookings = calendarData[selectedDateStr] || [];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="admin-title">Admin Dashboard</h1>
            <p className="text-slate-500">Manage bookings and view analytics</p>
          </div>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="mt-4 md:mt-0 rounded-full"
            data-testid="refresh-btn"
          >
            <RefreshCw className="mr-2" size={18} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="admin-card bg-white rounded-2xl border border-slate-100 p-6"
                data-testid="stat-total-bookings"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CalendarDays className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.total_bookings || 0}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="admin-card bg-white rounded-2xl border border-slate-100 p-6"
                data-testid="stat-today"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Clock className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Today's Bookings</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.today_bookings || 0}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="admin-card bg-white rounded-2xl border border-slate-100 p-6"
                data-testid="stat-pending"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Users className="text-yellow-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.pending || 0}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="admin-card bg-white rounded-2xl border border-slate-100 p-6"
                data-testid="stat-revenue"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">${stats?.total_revenue?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Calendar & Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-6"
              >
                <h2 className="text-lg font-bold text-slate-900 mb-4">Calendar</h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={{
                    hasBookings: (date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      return calendarData[dateStr] && calendarData[dateStr].length > 0;
                    }
                  }}
                  modifiersStyles={{
                    hasBookings: {
                      backgroundColor: "#DBEAFE",
                      fontWeight: "bold"
                    }
                  }}
                  className="rounded-xl"
                  data-testid="admin-calendar"
                />

                {/* Selected Date Bookings */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  {selectedDateBookings.length === 0 ? (
                    <p className="text-slate-400 text-sm">No bookings</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateBookings.map((booking) => (
                        <div 
                          key={booking.id}
                          className="p-3 bg-slate-50 rounded-xl text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-900">{booking.customer_name}</p>
                              <p className="text-slate-500">{booking.customer_phone}</p>
                              {booking.is_monthly && (
                                <span className="text-xs text-green-600 font-medium">Monthly</span>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Bookings List */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-lg font-bold text-slate-900">All Bookings</h2>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No bookings found
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredBookings.map((booking) => (
                      <div 
                        key={booking.id}
                        className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors"
                        data-testid={`booking-${booking.id}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-bold text-slate-900">{booking.customer_name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(booking.payment_status)}`}>
                                {booking.payment_status}
                              </span>
                              {booking.is_monthly && (
                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                  Monthly
                                </span>
                              )}
                              {booking.sms_opt_in && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                  SMS
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500 space-y-1">
                              <p>
                                <strong>Dates:</strong> {(booking.booking_dates || [booking.booking_date]).join(", ")}
                                {booking.monthly_days && booking.monthly_days.length > 0 && (
                                  <span className="text-green-600 ml-2">({booking.monthly_days.join(" & ")})</span>
                                )}
                              </p>
                              <p>
                                <strong>Services:</strong> {booking.services?.map(s => `${s.service_id}${s.quantity > 1 ? ` (${s.quantity})` : ''}`).join(", ")}
                              </p>
                              <p>
                                <strong>Total:</strong> ${booking.total?.toFixed(2)}
                              </p>
                              <p>
                                <strong>Contact:</strong> {booking.customer_phone}
                                {booking.customer_email && booking.customer_email !== "noemail@upwash.com" && ` | ${booking.customer_email}`}
                              </p>
                              <p>
                                <strong>Address:</strong> {booking.customer_address}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {/* SMS Reminder Button */}
                            {smsConfigured && booking.sms_opt_in && booking.status !== "cancelled" && booking.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendReminder(booking.id)}
                                className="rounded-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                data-testid={`send-reminder-${booking.id}`}
                              >
                                <MessageSquare size={16} className="mr-1" /> Send Reminder
                              </Button>
                            )}
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatus(booking.id, "confirmed")}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                                  data-testid={`confirm-booking-${booking.id}`}
                                >
                                  <CheckCircle size={16} className="mr-1" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateBookingStatus(booking.id, "cancelled")}
                                  className="rounded-full text-red-600 border-red-200 hover:bg-red-50"
                                  data-testid={`cancel-booking-${booking.id}`}
                                >
                                  <XCircle size={16} className="mr-1" /> Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() => updateBookingStatus(booking.id, "completed")}
                                className="bg-green-600 hover:bg-green-700 text-white rounded-full"
                                data-testid={`complete-booking-${booking.id}`}
                              >
                                <CheckCircle size={16} className="mr-1" /> Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
