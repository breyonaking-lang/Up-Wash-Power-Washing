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
  Droplets,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  MessageSquare,
  CalendarDays,
  Star,
  Home,
  HardHat,
  Camera,
  FileText,
  Mail,
  Building2,
  AlertCircle
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
    pricingType: "tiered",
    bookingDays: [0, 1, 2, 3], // Mon-Thu
    needsTime: false,
    popupMessage: "Please set your recycling bins out the night before your scheduled service!"
  },
  {
    id: "patio",
    name: "Patio Cleaning",
    description: "Deep clean your outdoor patio",
    icon: Sparkles,
    color: "bg-blue-500",
    price: 85,
    pricingType: "fixed",
    bookingDays: [2, 3], // Wed-Thu only
    needsTime: true,
    timeSlots: ["09:00", "13:00"] // 4-hour blocks: 9am-1pm, 1pm-5pm
  },
  {
    id: "driveway",
    name: "Driveway Cleaning",
    description: "Remove stains and restore your driveway",
    icon: Car,
    color: "bg-orange-500",
    price: 85,
    pricingType: "fixed",
    bookingDays: [2, 3], // Wed-Thu only
    needsTime: true,
    timeSlots: ["09:00", "13:00"]
  },
  {
    id: "dumpster",
    name: "Dumpster Cleaning",
    description: "Commercial dumpster & surrounding area",
    icon: Warehouse,
    color: "bg-purple-500",
    pricingType: "tiered",
    bookingDays: [0, 1, 2, 3, 4], // Mon-Fri
    needsTime: false
  },
  {
    id: "home_powerwash",
    name: "Home Power Washing",
    description: "Complete home exterior - siding, deck, porch & more",
    icon: Home,
    color: "bg-cyan-500",
    pricingType: "quote",
    bookingDays: [2, 3], // Wed-Thu only
    needsTime: true,
    timeSlots: ["09:00", "13:00"]
  },
  {
    id: "construction_cleanup",
    name: "Construction Site Cleanup",
    description: "Post-construction cleaning and debris removal",
    icon: HardHat,
    color: "bg-amber-500",
    pricingType: "quote",
    bookingDays: [0, 1, 2, 3, 4], // Any weekday
    needsTime: false // Day only, no time
  },
  {
    id: "commercial",
    name: "Commercial Properties",
    description: "Schools, apartments & commercial buildings",
    icon: Building2,
    color: "bg-indigo-500",
    pricingType: "quote",
    bookingDays: [0, 1, 2, 3, 4], // Any weekday
    needsTime: false // Day only, no time
  }
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Generate days 1-31 for month selection
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const cancelled = searchParams.get("cancelled");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingMode, setBookingMode] = useState("single"); // "single" or "monthly"
  
  // Single booking date
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Monthly subscription - days of the month (1-31)
  const [monthlyServiceDays, setMonthlyServiceDays] = useState([]); // e.g., [1, 15] for 1st and 15th
  const [serviceDaysPerMonth, setServiceDaysPerMonth] = useState(2); // How many days per month
  const [monthlyStartDate, setMonthlyStartDate] = useState(null);

  // Service selections
  const [selectedServices, setSelectedServices] = useState({});
  const [binQuantity, setBinQuantity] = useState(1);
  const [dumpsterQuantity, setDumpsterQuantity] = useState(1);
  const [scentBombs, setScentBombs] = useState(0);

  // Customer info
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });
  const [distance, setDistance] = useState(0);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  
  // Quote service details
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quotePhotos, setQuotePhotos] = useState([]);
  
  // Subscription options
  const [subscribeMonthly, setSubscribeMonthly] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState({
    subtotal_per_day: 0,
    subtotal: 0,
    travel_fee: 0,
    discount: 0,
    discount_percent: 5,
    total: 0,
    num_service_days: 1
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
  }, [selectedServices, binQuantity, dumpsterQuantity, scentBombs, bookingMode, monthlyServiceDays, serviceDaysPerMonth, distance]);

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
      services.push({ service_id: "dumpster", quantity: dumpsterQuantity });
    }
    if (scentBombs > 0) {
      services.push({ service_id: "scent_bomb", quantity: scentBombs });
    }

    if (services.length === 0) {
      setPricing({ subtotal_per_day: 0, subtotal: 0, travel_fee: 0, discount: 0, discount_percent: 5, total: 0, num_service_days: 1 });
      return;
    }

    const numDays = bookingMode === "monthly" ? serviceDaysPerMonth : 1;

    try {
      const response = await axios.post(`${API}/calculate-price`, {
        services,
        distance_miles: distance,
        is_monthly: bookingMode === "monthly",
        num_service_days: numDays
      });
      setPricing(response.data);
    } catch (error) {
      console.error("Error calculating price:", error);
    }
  };

  const toggleService = (serviceId) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const toggleMonthlyServiceDay = (day) => {
    if (monthlyServiceDays.includes(day)) {
      setMonthlyServiceDays(monthlyServiceDays.filter(d => d !== day));
    } else if (monthlyServiceDays.length < serviceDaysPerMonth) {
      setMonthlyServiceDays([...monthlyServiceDays, day].sort((a, b) => a - b));
    }
  };

  // Update selected days when serviceDaysPerMonth changes
  useEffect(() => {
    if (monthlyServiceDays.length > serviceDaysPerMonth) {
      setMonthlyServiceDays(monthlyServiceDays.slice(0, serviceDaysPerMonth));
    }
  }, [serviceDaysPerMonth]);

  // Calculate distance when address changes
  const calculateDistanceFromAddress = async (address) => {
    if (!address || address.length < 10) {
      setDistanceInfo(null);
      return;
    }

    setCalculatingDistance(true);
    try {
      const response = await axios.post(`${API}/calculate-distance`, { address });
      if (response.data.success) {
        setDistanceInfo(response.data);
        setDistance(response.data.distance_miles);
        if (response.data.travel_fee > 0) {
          toast.info(`Travel fee: $${response.data.travel_fee.toFixed(2)} (${response.data.distance_miles} miles from Burleson)`);
        }
      } else {
        setDistanceInfo({ success: false, error: response.data.error });
      }
    } catch (error) {
      console.error("Error calculating distance:", error);
      setDistanceInfo({ success: false, error: "Could not calculate distance" });
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Debounce address input for distance calculation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerInfo.address) {
        calculateDistanceFromAddress(customerInfo.address);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [customerInfo.address]);

  const isDateDisabled = (date) => {
    return isWeekend(date) || isBefore(date, startOfToday());
  };

  const hasSelectedServices = Object.values(selectedServices).some(v => v);

  const canProceedToStep2 = hasSelectedServices;
  const canProceedToStep3 = bookingMode === "single" 
    ? selectedDate !== null 
    : monthlyServiceDays.length === serviceDaysPerMonth && monthlyStartDate !== null;

  const getBookingDates = () => {
    if (bookingMode === "single" && selectedDate) {
      return [format(selectedDate, "yyyy-MM-dd")];
    }
    if (bookingMode === "monthly" && monthlyStartDate) {
      // For monthly, we'll store the start date and the selected days
      return [format(monthlyStartDate, "yyyy-MM-dd")];
    }
    return [];
  };

  const handleSubmitBooking = async () => {
    if (!hasSelectedServices) {
      toast.error("Please select at least one service");
      return;
    }

    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate quote requirements
    if (hasQuoteService()) {
      if (!quoteDescription || quoteDescription.trim().length === 0) {
        toast.error("Please provide a description for your quote request");
        return;
      }
      if (quotePhotos.length === 0) {
        toast.error("Please upload at least one photo for your quote request");
        return;
      }
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
      services.push({ service_id: "dumpster", quantity: dumpsterQuantity });
    }
    if (scentBombs > 0) {
      services.push({ service_id: "scent_bomb", quantity: scentBombs });
    }

    try {
      const response = await axios.post(`${API}/bookings`, {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email || "noemail@upwash.com",
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        distance_miles: distance,
        services,
        booking_dates: getBookingDates(),
        is_monthly: bookingMode === "monthly",
        monthly_service_days: bookingMode === "monthly" ? monthlyServiceDays : null,
        service_days_per_month: bookingMode === "monthly" ? serviceDaysPerMonth : null,
        sms_opt_in: smsOptIn,
        recurring_payment: savePaymentMethod,
        notes: customerInfo.notes,
        quote_description: hasQuoteService() ? quoteDescription : null,
        quote_photos: hasQuoteService() && quotePhotos.length > 0 ? quotePhotos : null
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

  const getBinPrice = () => {
    if (binQuantity === 1) return 15;
    if (binQuantity === 2) return 25;
    return 25 + (binQuantity - 2) * 8;
  };

  const getDumpsterPrice = () => {
    if (dumpsterQuantity === 1) return 85;
    return 85 + (dumpsterQuantity - 1) * 45;
  };

  // Check if any quote-based service is selected
  const hasQuoteService = () => {
    return selectedServices.home_powerwash || selectedServices.construction_cleanup;
  };

  // Handle photo uploads - convert to base64
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + quotePhotos.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }

    const newPhotos = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per photo.`);
        continue;
      }
      
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      newPhotos.push(base64);
    }
    
    setQuotePhotos([...quotePhotos, ...newPhotos]);
    toast.success(`${newPhotos.length} photo(s) added`);
  };

  const removePhoto = (index) => {
    setQuotePhotos(quotePhotos.filter((_, i) => i !== index));
  };

  // Calculate local subtotal for instant UI feedback
  const getLocalSubtotalPerDay = () => {
    let total = 0;
    if (selectedServices.recycling_bin) total += getBinPrice();
    if (selectedServices.patio) total += 85;
    if (selectedServices.driveway) total += 85;
    if (selectedServices.dumpster) total += getDumpsterPrice();
    if (scentBombs > 0) total += scentBombs * 3.50;
    // Quote services don't add to total
    return total;
  };

  const getNumServiceDays = () => {
    return bookingMode === "monthly" ? serviceDaysPerMonth : 1;
  };

  const getLocalTotal = () => {
    const subtotalPerDay = getLocalSubtotalPerDay();
    const numDays = getNumServiceDays();
    const subtotal = subtotalPerDay * numDays;
    const discount = bookingMode === "monthly" ? subtotal * 0.05 : 0;
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

                            {/* Dumpster quantity selector */}
                            {service.id === "dumpster" && selectedServices.dumpster && (
                              <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <span className="text-sm text-slate-600">Quantity:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setDumpsterQuantity(Math.max(1, dumpsterQuantity - 1))}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="dumpster-quantity-minus"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="w-8 text-center font-bold" data-testid="dumpster-quantity-value">{dumpsterQuantity}</span>
                                  <button
                                    onClick={() => setDumpsterQuantity(dumpsterQuantity + 1)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                    data-testid="dumpster-quantity-plus"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                                <span className="text-blue-600 font-bold">${getDumpsterPrice()}</span>
                                <span className="text-xs text-slate-400">($85 first, $45 each additional)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Scent Bomb Add-on - Standalone */}
                    <div
                      className={`p-4 rounded-2xl border-2 ${
                        scentBombs > 0 
                          ? "border-green-500 bg-green-50" 
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Droplets className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900">Scent Bomb Add-on</h3>
                          <p className="text-sm text-slate-500">Deodorizing scent treatment - $3.50 each</p>
                        </div>
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
                        {scentBombs > 0 && (
                          <span className="text-green-600 font-bold">${(scentBombs * 3.50).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceedToStep2}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-full"
                      data-testid="continue-to-schedule-btn"
                    >
                      Continue <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Choose Booking Type & Schedule */}
              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Choose Your Plan</h2>
                  
                  {/* Booking Type Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div
                      onClick={() => setBookingMode("single")}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        bookingMode === "single" 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                      data-testid="single-booking-option"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <CalendarDays className={bookingMode === "single" ? "text-blue-600" : "text-slate-400"} size={24} />
                        <h3 className="font-bold text-lg">Single Service</h3>
                      </div>
                      <p className="text-sm text-slate-500">Book a one-time cleaning for a specific date</p>
                    </div>

                    <div
                      onClick={() => setBookingMode("monthly")}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                        bookingMode === "monthly" 
                          ? "border-green-500 bg-green-50" 
                          : "border-slate-200 hover:border-green-300"
                      }`}
                      data-testid="monthly-booking-option"
                    >
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        SAVE 5%
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <Star className={bookingMode === "monthly" ? "text-green-600" : "text-slate-400"} size={24} />
                        <h3 className="font-bold text-lg">Monthly Subscription</h3>
                      </div>
                      <p className="text-sm text-slate-500">Choose 2 days per month for regular cleanings</p>
                    </div>
                  </div>

                  {/* Single Booking Calendar */}
                  {bookingMode === "single" && (
                    <div>
                      <Label className="mb-2 block text-lg font-semibold">Select Your Service Date</Label>
                      <p className="text-sm text-slate-500 mb-4">We operate Monday through Friday</p>
                      <div className="border rounded-2xl p-4 bg-slate-50 inline-block">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={isDateDisabled}
                          fromDate={startOfToday()}
                          toDate={addDays(new Date(), 60)}
                          className="rounded-xl"
                          data-testid="booking-calendar"
                        />
                      </div>
                      {selectedDate && (
                        <p className="mt-4 text-blue-600 font-medium">
                          Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Monthly Subscription */}
                  {bookingMode === "monthly" && (
                    <div>
                      {/* How many days per month */}
                      <div className="mb-6">
                        <Label className="mb-2 block text-lg font-semibold">How Many Days Per Month?</Label>
                        <p className="text-sm text-slate-500 mb-4">Select how many times per month you'd like service</p>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              onClick={() => setServiceDaysPerMonth(num)}
                              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                                serviceDaysPerMonth === num
                                  ? "bg-green-500 text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                              data-testid={`service-days-${num}`}
                            >
                              {num} {num === 1 ? 'day' : 'days'}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-green-600 font-medium">
                          {serviceDaysPerMonth} service {serviceDaysPerMonth === 1 ? 'day' : 'days'} per month selected
                        </p>
                      </div>

                      {/* Select specific days of the month */}
                      <div className="mb-6">
                        <Label className="mb-2 block text-lg font-semibold">Select Days of the Month</Label>
                        <p className="text-sm text-slate-500 mb-4">
                          Choose {serviceDaysPerMonth} day{serviceDaysPerMonth > 1 ? 's' : ''} when you'd like service each month
                        </p>
                        <div className="grid grid-cols-7 gap-2 max-w-md">
                          {MONTH_DAYS.map((day) => (
                            <button
                              key={day}
                              onClick={() => toggleMonthlyServiceDay(day)}
                              disabled={!monthlyServiceDays.includes(day) && monthlyServiceDays.length >= serviceDaysPerMonth}
                              className={`w-10 h-10 rounded-lg font-medium transition-all text-sm ${
                                monthlyServiceDays.includes(day)
                                  ? "bg-green-500 text-white"
                                  : monthlyServiceDays.length >= serviceDaysPerMonth
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                              data-testid={`monthly-day-${day}`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                        {monthlyServiceDays.length > 0 && (
                          <p className="mt-3 text-green-600 font-medium">
                            Service on the {monthlyServiceDays.map((d, i) => {
                              const suffix = d === 1 || d === 21 || d === 31 ? 'st' : 
                                            d === 2 || d === 22 ? 'nd' : 
                                            d === 3 || d === 23 ? 'rd' : 'th';
                              return (i === monthlyServiceDays.length - 1 && monthlyServiceDays.length > 1) 
                                ? `and ${d}${suffix}` 
                                : `${d}${suffix}${i < monthlyServiceDays.length - 2 ? ', ' : ' '}`;
                            })} of each month
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="mb-2 block text-lg font-semibold">Start Date</Label>
                        <p className="text-sm text-slate-500 mb-4">When should your subscription begin?</p>
                        <div className="border rounded-2xl p-4 bg-slate-50 inline-block">
                          <Calendar
                            mode="single"
                            selected={monthlyStartDate}
                            onSelect={setMonthlyStartDate}
                            disabled={isDateDisabled}
                            fromDate={startOfToday()}
                            toDate={addDays(new Date(), 60)}
                            className="rounded-xl"
                            data-testid="monthly-start-calendar"
                          />
                        </div>
                      </div>

                      {/* Payment Info */}
                      <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2">Billing Information</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• You'll pay for your first service today</li>
                          <li>• Future services are charged 3 days in advance</li>
                          <li>• If payment fails, you'll receive a notification to update your payment method</li>
                        </ul>
                      </div>
                    </div>
                  )}

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
                      disabled={!canProceedToStep3}
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
                      <Label htmlFor="address">Service Address *</Label>
                      <Input
                        id="address"
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                        placeholder="123 Main St, Burleson, TX"
                        className="mt-1 rounded-xl"
                        data-testid="customer-address-input"
                      />
                      
                      {/* Distance calculation result */}
                      {calculatingDistance && (
                        <p className="text-sm text-blue-500 mt-2 flex items-center gap-2">
                          <span className="animate-spin">⏳</span> Calculating distance...
                        </p>
                      )}
                      
                      {distanceInfo && !calculatingDistance && (
                        <div className={`mt-2 p-3 rounded-xl text-sm ${
                          distanceInfo.success 
                            ? distanceInfo.is_within_free_radius 
                              ? "bg-green-50 border border-green-200"
                              : "bg-orange-50 border border-orange-200"
                            : "bg-red-50 border border-red-200"
                        }`}>
                          {distanceInfo.success ? (
                            <>
                              <div className="flex items-center gap-2">
                                <MapPin size={16} className={distanceInfo.is_within_free_radius ? "text-green-600" : "text-orange-600"} />
                                <span className="font-medium">
                                  {distanceInfo.distance_text} from Burleson
                                </span>
                                <span className="text-slate-500">({distanceInfo.duration_text} drive)</span>
                              </div>
                              {distanceInfo.is_within_free_radius ? (
                                <p className="text-green-700 mt-1">✓ Within free service area - no travel fee!</p>
                              ) : (
                                <p className="text-orange-700 mt-1">
                                  Travel fee: <strong>${distanceInfo.travel_fee.toFixed(2)}</strong> 
                                  <span className="text-orange-600"> ({(distanceInfo.distance_miles - 15).toFixed(1)} miles beyond free radius)</span>
                                </p>
                              )}
                              
                              {/* Map Preview */}
                              {distanceInfo.customer_coords && distanceInfo.burleson_coords && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-slate-200">
                                  <img 
                                    src={`https://maps.googleapis.com/maps/api/staticmap?size=400x200&scale=2&markers=color:red%7Clabel:S%7C${distanceInfo.customer_coords.lat},${distanceInfo.customer_coords.lng}&markers=color:blue%7Clabel:B%7C${distanceInfo.burleson_coords.lat},${distanceInfo.burleson_coords.lng}&path=color:0x007AFF%7Cweight:3%7C${distanceInfo.customer_coords.lat},${distanceInfo.customer_coords.lng}%7C${distanceInfo.burleson_coords.lat},${distanceInfo.burleson_coords.lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`}
                                    alt="Service location map"
                                    className="w-full h-auto"
                                  />
                                  <div className="p-2 bg-slate-50 text-xs text-slate-600 flex justify-between">
                                    <span><span className="text-red-500">●</span> Your Location</span>
                                    <span><span className="text-blue-500">●</span> Burleson (Base)</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-red-600">
                              Could not calculate distance. You can enter manually below.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        placeholder="(817) 555-1234"
                        className="mt-1 rounded-xl"
                        data-testid="customer-phone-input"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email (optional)</Label>
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

                    {/* SMS Opt-in */}
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="smsOptIn" 
                          checked={smsOptIn}
                          onCheckedChange={setSmsOptIn}
                          className="mt-1"
                          data-testid="sms-opt-in-checkbox"
                        />
                        <Label htmlFor="smsOptIn" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={18} className="text-blue-600" />
                            <span className="font-bold text-slate-900">Text Message Reminders</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Receive service reminders and updates via text message
                          </p>
                        </Label>
                      </div>
                    </div>

                    {/* Quote Service Details - only show if quote service selected */}
                    {hasQuoteService() && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={20} className="text-amber-600" />
                          <h3 className="font-bold text-amber-900">Quote Request Details</h3>
                        </div>
                        <p className="text-sm text-amber-700 mb-4">
                          Help us provide an accurate quote by describing your project and uploading photos. Both are required.
                        </p>
                        
                        <div>
                          <Label htmlFor="quoteDescription" className="text-amber-900">Describe Your Project <span className="text-red-500">*</span></Label>
                          <Textarea
                            id="quoteDescription"
                            value={quoteDescription}
                            onChange={(e) => setQuoteDescription(e.target.value)}
                            placeholder="Describe the area, size, current condition, any specific concerns..."
                            className="mt-1 rounded-xl bg-white"
                            rows={4}
                            required
                            data-testid="quote-description-input"
                          />
                        </div>

                        <div>
                          <Label className="text-amber-900 mb-2 block">Upload Photos <span className="text-red-500">*</span> (at least 1, max 5)</Label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {quotePhotos.map((photo, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={photo} 
                                  alt={`Quote photo ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-amber-200"
                                />
                                <button
                                  onClick={() => removePhoto(index)}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  type="button"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {quotePhotos.length < 5 && (
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                              <Camera size={18} className="text-amber-600" />
                              <span className="text-amber-900 font-medium">Add Photos</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoUpload}
                                className="hidden"
                                data-testid="quote-photo-input"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Email Notifications - show if email provided */}
                    {customerInfo.email && (
                      <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                        <div className="flex items-center gap-2">
                          <Mail size={18} className="text-green-600" />
                          <span className="text-green-900 font-medium">Email Confirmation</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          A booking confirmation will be sent to {customerInfo.email}
                        </p>
                      </div>
                    )}

                    {/* Subscription Options - for fixed price services with monthly booking */}
                    {bookingMode === "monthly" && !hasQuoteService() && (
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                        <h3 className="font-bold text-purple-900 flex items-center gap-2">
                          <CreditCard size={18} />
                          Payment Options
                        </h3>
                        
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            id="savePaymentMethod" 
                            checked={savePaymentMethod}
                            onCheckedChange={setSavePaymentMethod}
                            className="mt-1"
                            data-testid="save-payment-checkbox"
                          />
                          <Label htmlFor="savePaymentMethod" className="cursor-pointer">
                            <span className="font-medium text-slate-900">Save card for recurring payments</span>
                            <p className="text-sm text-slate-600">
                              Automatically charge monthly for your subscription
                            </p>
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* Manual distance input - shown if auto-calculation not available */}
                    {(!distanceInfo || !distanceInfo.success) && !calculatingDistance && customerInfo.address && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <Label htmlFor="distance" className="text-slate-700">Manual Distance Entry (miles from Burleson)</Label>
                        <div className="flex items-center gap-3 mt-2">
                          <Input
                            id="distance"
                            type="number"
                            min="0"
                            value={distance}
                            onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="rounded-xl w-32"
                            data-testid="distance-input"
                          />
                          <p className="text-sm text-slate-500 flex items-center gap-2">
                            <MapPin size={14} />
                            Free within 15 miles, $1/mile beyond
                          </p>
                        </div>
                      </div>
                    )}

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
                      disabled={loading || !customerInfo.name || !customerInfo.phone || !customerInfo.address || (hasQuoteService() && (!quoteDescription.trim() || quotePhotos.length === 0))}
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
                      {bookingMode === "single" && selectedDate && (
                        <p><strong>Date:</strong> {format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                      )}
                      {bookingMode === "monthly" && (
                        <>
                          <p><strong>Plan:</strong> Monthly Subscription (5% off)</p>
                          <p><strong>Service Days:</strong> {monthlyDays.join(" & ")}</p>
                          {monthlyStartDate && (
                            <p><strong>Starting:</strong> {format(monthlyStartDate, "MMMM d, yyyy")}</p>
                          )}
                        </>
                      )}
                      <p><strong>Name:</strong> {customerInfo.name}</p>
                      <p><strong>Phone:</strong> {customerInfo.phone}</p>
                      <p><strong>Address:</strong> {customerInfo.address}</p>
                      {smsOptIn && <p className="text-blue-600">✓ Text reminders enabled</p>}
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
                      {loading ? "Processing..." : `Pay Now - $${(pricing.total || getLocalTotal()).toFixed(2)}`}
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
              
              {hasSelectedServices || scentBombs > 0 ? (
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
                        <span className="font-medium">$85</span>
                      </div>
                    )}
                    {selectedServices.driveway && (
                      <div className="flex justify-between">
                        <span>Driveway Cleaning</span>
                        <span className="font-medium">$85</span>
                      </div>
                    )}
                    {selectedServices.dumpster && (
                      <div className="flex justify-between">
                        <span>Dumpster ({dumpsterQuantity})</span>
                        <span className="font-medium">${getDumpsterPrice()}</span>
                      </div>
                    )}
                    {selectedServices.home_powerwash && (
                      <div className="flex justify-between text-cyan-600">
                        <span>Home Power Washing</span>
                        <span className="font-medium italic">Quote</span>
                      </div>
                    )}
                    {selectedServices.construction_cleanup && (
                      <div className="flex justify-between text-amber-600">
                        <span>Construction Cleanup</span>
                        <span className="font-medium italic">Quote</span>
                      </div>
                    )}
                    {scentBombs > 0 && (
                      <div className="flex justify-between text-pink-600">
                        <span>Scent Bombs ({scentBombs})</span>
                        <span>${(scentBombs * 3.50).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Quote Notice */}
                  {hasQuoteService() && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                      <p className="text-amber-800 font-medium">Quote-based services</p>
                      <p className="text-amber-600 text-xs mt-1">We'll contact you with a custom quote after reviewing your request.</p>
                    </div>
                  )}

                  {getLocalSubtotalPerDay() > 0 && (
                    <>
                      <div className="border-t border-slate-200 mt-4 pt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Per Day</span>
                          <span>${getLocalSubtotalPerDay().toFixed(2)}</span>
                        </div>
                        {bookingMode === "monthly" && monthlyDays.length > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>× {monthlyDays.length} days/month</span>
                            <span>${(getLocalSubtotalPerDay() * monthlyDays.length).toFixed(2)}</span>
                          </div>
                        )}
                        {bookingMode === "monthly" && (
                          <div className="flex justify-between text-green-600">
                            <span>Monthly Discount (5%)</span>
                            <span>-${(getLocalSubtotalPerDay() * getNumServiceDays() * 0.05).toFixed(2)}</span>
                          </div>
                        )}
                        {distance > 15 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Travel Fee</span>
                            <span>+${(distance - 15).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-200 mt-4 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">Total</span>
                          <span className="text-2xl font-extrabold text-blue-600 price-tag" data-testid="total-price">
                            ${getLocalTotal().toFixed(2)}
                            {hasQuoteService() && <span className="text-sm font-normal text-slate-500"> + Quote</span>}
                          </span>
                        </div>
                        {bookingMode === "monthly" && (
                          <p className="text-xs text-slate-500 mt-1">per month</p>
                        )}
                      </div>
                    </>
                  )}

                  {getLocalSubtotalPerDay() === 0 && hasQuoteService() && (
                    <div className="border-t border-slate-200 mt-4 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="text-xl font-bold text-amber-600">Quote Required</span>
                      </div>
                    </div>
                  )}

                  {bookingMode === "single" && selectedDate && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm">
                      <p className="font-medium text-blue-900">
                        {format(selectedDate, "EEEE, MMM d")}
                      </p>
                    </div>
                  )}

                  {bookingMode === "monthly" && monthlyDays.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm">
                      <p className="font-medium text-green-900">
                        Every {monthlyDays.join(" & ")}
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
