import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Calendar } from "../components/ui/calendar";
import { Textarea } from "../components/ui/textarea";
import { 
  Trash2, 
  Warehouse, 
  Car, 
  Sparkles,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  Clock
} from "lucide-react";
import { format, addDays, isWeekend, isBefore, startOfToday } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SERVICES = [
  {
    id: "recycling_bin",
    name: "Recycling Bin Cleaning",
    description: "Power wash recycling bins inside and out",
    icon: Trash2,
    color: "bg-green-500",
    pricingType: "tiered"
  },
  {
    id: "patio",
    name: "Patio Cleaning",
    description: "Deep clean your outdoor patio",
    icon: Sparkles,
    color: "bg-blue-500",
    price: 30,
    pricingType: "fixed"
  },
  {
    id: "driveway",
    name: "Driveway Cleaning",
    description: "Remove stains and restore your driveway",
    icon: Car,
    color: "bg-orange-500",
    price: 30,
    pricingType: "fixed"
  },
  {
    id: "dumpster",
    name: "Dumpster Cleaning",
    description: "Commercial dumpster & surrounding area",
    icon: Warehouse,
    color: "bg-purple-500",
    price: 120,
    pricingType: "fixed",
    hasAddon: true
  }
];

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Service selections
  const [selectedServices, setSelectedServices] = useState({});
  const [binQuantity, setBinQuantity] = useState(1);
  const [scentBombs, setScentBombs] = useState(0);
  const [isMonthly, setIsMonthly] = useState(false);

  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });
  const [distance, setDistance] = useState(0);

  // Pricing
  const [pricing, setPricing] = useState({
    subtotal: 0,
    travel_fee: 0,
    discount: 0,
    total: 0
  });

  // Booking result
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    if (cancelled) {
      toast.error("Payment was cancelled. Please try again.");
    }
  }, [cancelled]);

  // Calculate pricing whenever selections change
  useEffect(() => {
    calculatePrice();
  }, [selectedServices, binQuantity, scentBombs, isMonthly, distance]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(format(selectedDate, "yyyy-MM-dd"));
    }
  }, [selectedDate]);

  const calculatePrice = async () => {
    const services = [];
    
    if (selectedServices.recycling_bin) {
      services.push({ service_id: "recycling_bin", quantity: binQuantity });
    }
    if (selectedServices.patio) {
      services.push({ service_id: "patio", quantity: 1 });
    }
    if (selectedServices.driveway) {
      services.push({ service_id: "driveway", quantity: 1 });
    }
    if (selectedServices.dumpster) {
      services.push({ 
        service_id: "dumpster", 
        quantity: 1,
        addons: scentBombs > 0 ? [{ addon_id: "scent_bomb", quantity: scentBombs }] : []
      });
    }

    if (services.length === 0) {
      setPricing({ subtotal: 0, travel_fee: 0, discount: 0, total: 0 });
      return;
    }

    try {
      const response = await axios.post(`${API}/calculate-price`, {
        services,
        distance_miles: distance,
        is_monthly: isMonthly
      });
      setPricing(response.data);
    } catch (error) {
      console.error("Error calculating price:", error);
    }
  };

  const fetchAvailableSlots = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const response = await axios.post(`${API}/availability`, { date: dateStr });
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const isDateDisabled = (date) => {
    return isWeekend(date) || isBefore(date, startOfToday());
  };

  const hasSelectedServices = Object.values(selectedServices).some(v => v);

  const handleSubmitBooking = async () => {
    if (!hasSelectedServices || !selectedDate || !selectedTime) {
      toast.error("Please complete all required fields");
      return;
    }

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      toast.error("Please fill in all customer information");
      return;
    }

    setLoading(true);

    const services = [];
    if (selectedServices.recycling_bin) {
      services.push({ service_id: "recycling_bin", quantity: binQuantity });
    }
    if (selectedServices.patio) {
      services.push({ service_id: "patio", quantity: 1 });
    }
    if (selectedServices.driveway) {
      services.push({ service_id: "driveway", quantity: 1 });
    }
    if (selectedServices.dumpster) {
      services.push({ 
        service_id: "dumpster", 
        quantity: 1,
        addons: scentBombs > 0 ? [{ addon_id: "scent_bomb", quantity: scentBombs }] : []
      });
    }

    try {
      const response = await axios.post(`${API}/bookings`, {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        distance_miles: distance,
        services,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        booking_time: selectedTime,
        is_monthly: isMonthly,
        notes: customerInfo.notes
      });

      setBookingId(response.data.id);
      setStep(4);
      toast.success("Booking created successfully!");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(error.response?.data?.detail || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingId) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API}/checkout/session`, {
        booking_id: bookingId,
        origin_url: window.location.origin
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    const [hour] = time.split(":");
    const h = parseInt(hour);
    return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
  };

  const getBinPrice = () => {
    if (binQuantity === 1) return 15;
    if (binQuantity === 2) return 25;
    return 25 + (binQuantity - 2) * 8;
  };

  // Calculate local subtotal for instant UI feedback
  const getLocalSubtotal = () => {
    let total = 0;
    if (selectedServices.recycling_bin) total += getBinPrice();
    if (selectedServices.patio) total += 30;
    if (selectedServices.driveway) total += 30;
    if (selectedServices.dumpster) total += 120 + (scentBombs * 3);
    return total;
  };

  const getLocalTotal = () => {
    const subtotal = getLocalSubtotal();
    const discount = isMonthly ? subtotal * 0.10 : 0;
    const travelFee = distance > 15 ? (distance - 15) * 1 : 0;
    return subtotal - discount + travelFee;
  };

  return (
    <div className="min-h-screen py-12 md:py-20">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 uppercase">
            Book Your Service
          </h1>
          <p className="text-slate-500 mt-2">Schedule your power washing appointment</p>
        </motion.div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step === s 
                      ? "bg-blue-600 text-white" 
                      : step > s 
                        ? "bg-green-500 text-white" 
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {step > s ? <Check size={20} /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-12 h-1 ${step > s ? "bg-green-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8"
            >
              {/* Step 1: Select Services */}
              {step === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Select Services</h2>
                  
                  <div className="space-y-4">
                    {SERVICES.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`service-select-card p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedServices[service.id] 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                        data-testid={`select-service-${service.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <service.icon className="text-white" size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-slate-900">{service.name}</h3>
                                <p className="text-sm text-slate-500">{service.description}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedServices[service.id] 
                                  ? "border-blue-500 bg-blue-500" 
                                  : "border-slate-300"
                              }`}>
                                {selectedServices[service.id] && <Check className="text-white" size={14} />}
                              </div>
                            </div>

                            {/* Bin quantity selector */}
                            {service.id === "recycling_bin" && selectedServices.recycling_bin && (
                              <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <span className="text-sm text-slate-600">Quantity:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setBinQuantity(Math.max(1, binQuantity - 1))}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="bin-quantity-minus"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-8 text-center font-bold" data-testid="bin-quantity-value">{binQuantity}</span>
                                  <button
                                    onClick={() => setBinQuantity(binQuantity + 1)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="bin-quantity-plus"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                                <span className="text-blue-600 font-bold">${getBinPrice()}</span>
                              </div>
                            )}

                            {/* Scent bomb addon for dumpster */}
                            {service.id === "dumpster" && selectedServices.dumpster && (
                              <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <span className="text-sm text-slate-600">Scent Bombs ($3 each):</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setScentBombs(Math.max(0, scentBombs - 1))}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="scent-bomb-minus"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-8 text-center font-bold" data-testid="scent-bomb-value">{scentBombs}</span>
                                  <button
                                    onClick={() => setScentBombs(scentBombs + 1)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="scent-bomb-plus"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Monthly option */}
                  <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        id="monthly" 
                        checked={isMonthly}
                        onCheckedChange={setIsMonthly}
                        data-testid="monthly-checkbox"
                      />
                      <Label htmlFor="monthly" className="cursor-pointer">
                        <span className="font-bold text-green-700">Monthly Plan</span>
                        <span className="text-green-600 ml-2">- Save 10% (2x weekly cleaning)</span>
                      </Label>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!hasSelectedServices}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full"
                      data-testid="continue-to-schedule-btn"
                    >
                      Continue <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Choose Date & Time</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Calendar */}
                    <div>
                      <Label className="mb-2 block">Select Date</Label>
                      <div className="border rounded-2xl p-4 bg-slate-50">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                          }}
                          disabled={isDateDisabled}
                          fromDate={startOfToday()}
                          toDate={addDays(new Date(), 60)}
                          className="rounded-xl"
                          data-testid="booking-calendar"
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                        <Clock size={14} />
                        Mon-Fri, 9AM - 6PM
                      </p>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <Label className="mb-2 block">Select Time</Label>
                      {!selectedDate ? (
                        <p className="text-slate-400 text-center py-12">Select a date first</p>
                      ) : loadingSlots ? (
                        <p className="text-slate-400 text-center py-12">Loading available times...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-orange-500 text-center py-12">No available slots for this date</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedTime(slot)}
                              className={`time-slot p-3 rounded-xl border-2 font-medium transition-all ${
                                selectedTime === slot
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-slate-200 hover:border-blue-300"
                              }`}
                              data-testid={`time-slot-${slot}`}
                            >
                              {formatTime(slot)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="rounded-full"
                      data-testid="back-to-services-btn"
                    >
                      <ArrowLeft className="mr-2" size={18} /> Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!selectedDate || !selectedTime}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full"
                      data-testid="continue-to-info-btn"
                    >
                      Continue <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Customer Info */}
              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Information</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                          placeholder="John Doe"
                          className="mt-1 rounded-xl"
                          data-testid="customer-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                          placeholder="(817) 555-1234"
                          className="mt-1 rounded-xl"
                          data-testid="customer-phone-input"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                        placeholder="john@example.com"
                        className="mt-1 rounded-xl"
                        data-testid="customer-email-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Service Address *</Label>
                      <Input
                        id="address"
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                        placeholder="123 Main St, Burleson, TX"
                        className="mt-1 rounded-xl"
                        data-testid="customer-address-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="distance">Distance from Burleson (miles)</Label>
                      <Input
                        id="distance"
                        type="number"
                        min="0"
                        value={distance}
                        onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 rounded-xl w-32"
                        data-testid="distance-input"
                      />
                      <p className="text-sm text-slate-500 mt-1">
                        Free within 15 miles, $1/mile beyond
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="notes">Special Instructions (optional)</Label>
                      <Textarea
                        id="notes"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                        placeholder="Gate code, parking instructions, etc."
                        className="mt-1 rounded-xl"
                        rows={3}
                        data-testid="customer-notes-input"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="rounded-full"
                      data-testid="back-to-schedule-btn"
                    >
                      <ArrowLeft className="mr-2" size={18} /> Back
                    </Button>
                    <Button
                      onClick={handleSubmitBooking}
                      disabled={loading || !customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full"
                      data-testid="submit-booking-btn"
                    >
                      {loading ? "Creating..." : "Confirm Booking"} <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {step === 4 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
                  <p className="text-slate-500 mb-8">Complete your payment to secure your appointment</p>

                  <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
                    <h3 className="font-bold text-slate-900 mb-4">Appointment Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Date:</strong> {selectedDate && format(selectedDate, "MMMM d, yyyy")}</p>
                      <p><strong>Time:</strong> {selectedTime && formatTime(selectedTime)}</p>
                      <p><strong>Name:</strong> {customerInfo.name}</p>
                      <p><strong>Address:</strong> {customerInfo.address}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handlePayment}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full text-lg w-full max-w-md"
                      data-testid="pay-now-btn"
                    >
                      <CreditCard className="mr-2" size={20} />
                      {loading ? "Processing..." : `Pay Now - $${pricing.total.toFixed(2)}`}
                    </Button>
                    
                    <p className="text-slate-500 text-sm">
                      Or pay with Cash App: <strong>$UpwashPW</strong>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Price Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Order Summary</h3>
              
              {hasSelectedServices ? (
                <>
                  <div className="space-y-3 text-sm">
                    {selectedServices.recycling_bin && (
                      <div className="flex justify-between">
                        <span>Recycling Bins ({binQuantity})</span>
                        <span className="font-medium">${getBinPrice()}</span>
                      </div>
                    )}
                    {selectedServices.patio && (
                      <div className="flex justify-between">
                        <span>Patio Cleaning</span>
                        <span className="font-medium">$30</span>
                      </div>
                    )}
                    {selectedServices.driveway && (
                      <div className="flex justify-between">
                        <span>Driveway Cleaning</span>
                        <span className="font-medium">$30</span>
                      </div>
                    )}
                    {selectedServices.dumpster && (
                      <>
                        <div className="flex justify-between">
                          <span>Dumpster Cleaning</span>
                          <span className="font-medium">$120</span>
                        </div>
                        {scentBombs > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>Scent Bombs ({scentBombs})</span>
                            <span>${scentBombs * 3}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-200 mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${(pricing.subtotal || getLocalSubtotal()).toFixed(2)}</span>
                    </div>
                    {isMonthly && (pricing.discount > 0 || getLocalSubtotal() > 0) && (
                      <div className="flex justify-between text-green-600">
                        <span>Monthly Discount (10%)</span>
                        <span>-${(pricing.discount || getLocalSubtotal() * 0.10).toFixed(2)}</span>
                      </div>
                    )}
                    {(pricing.travel_fee > 0 || (distance > 15)) && (
                      <div className="flex justify-between text-orange-600">
                        <span>Travel Fee</span>
                        <span>+${(pricing.travel_fee || (distance > 15 ? (distance - 15) : 0)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Total</span>
                      <span className="text-2xl font-extrabold text-blue-600 price-tag" data-testid="total-price">
                        ${(pricing.total || getLocalTotal()).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {selectedDate && selectedTime && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm">
                      <p className="font-medium text-blue-900">
                        {format(selectedDate, "MMM d")} at {formatTime(selectedTime)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-400 text-center py-8">Select services to see pricing</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
