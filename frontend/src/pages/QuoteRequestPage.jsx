import { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Home, HardHat, Building2, Camera, Upload, X, ArrowLeft, 
  Send, Phone, Mail, MapPin, User, CheckCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUOTE_SERVICES = {
  home_powerwash: {
    name: "Home Power Washing",
    icon: Home,
    color: "bg-cyan-500",
    description: "Whole-home exterior cleaning service including siding, gutters, decks, and fences."
  },
  construction_cleanup: {
    name: "Construction Site Cleanup",
    icon: HardHat,
    color: "bg-amber-500",
    description: "Post-construction cleaning including debris removal, window cleaning, and surface detailing."
  },
  commercial: {
    name: "Commercial Properties",
    icon: Building2,
    color: "bg-indigo-500",
    description: "Large-scale power washing for schools, apartments, offices, and retail centers."
  }
};

export default function QuoteRequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const serviceId = searchParams.get('service') || 'home_powerwash';
  const service = QUOTE_SERVICES[serviceId] || QUOTE_SERVICES.home_powerwash;
  const ServiceIcon = service.icon;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'TX',
    zip: '',
    description: '',
    preferredDay: ''
  });
  
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos(prev => [...prev, {
          file,
          preview: event.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.address || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (photos.length === 0) {
      toast.error('Please upload at least one photo of the area');
      return;
    }
    
    setLoading(true);
    try {
      // Convert photos to base64
      const photoData = photos.map(p => ({
        data: p.preview,
        name: p.name
      }));
      
      const res = await fetch(`${API}/quotes/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceId,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
          description: formData.description,
          preferred_day: formData.preferredDay,
          photos: photoData
        })
      });
      
      if (!res.ok) throw new Error('Failed to submit quote request');
      
      setSubmitted(true);
      toast.success('Quote request submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Quote Request Submitted!</h1>
            <p className="text-slate-600 mb-6">
              Thank you for your interest in our {service.name} service. 
              We'll review your request and contact you within 24-48 hours with a custom quote.
            </p>
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-blue-800 font-medium">What happens next?</p>
              <ul className="text-blue-700 text-sm mt-2 space-y-1">
                <li>• Our team will review your photos and description</li>
                <li>• We may contact you for additional details</li>
                <li>• You'll receive a detailed quote via SMS and email</li>
                <li>• Quote services are available Thursday & Friday only</li>
              </ul>
            </div>
            <Button 
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-full"
            >
              Return to Home
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/services')}
          className="flex items-center gap-2 text-slate-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Services
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className={`w-16 h-16 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <ServiceIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Request a Quote</h1>
          <p className="text-lg text-slate-600">{service.name}</p>
          <p className="text-slate-500 mt-2">{service.description}</p>
        </motion.div>

        {/* Quote Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          {/* Contact Information */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  required
                  data-testid="quote-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(817) 555-1234"
                  required
                  data-testid="quote-phone-input"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  data-testid="quote-email-input"
                />
              </div>
            </div>
          </div>

          {/* Service Location */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Service Location
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Main Street"
                  required
                  data-testid="quote-address-input"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Burleson"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="TX"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({...formData, zip: e.target.value})}
                    placeholder="76028"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferred Day */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Preferred Service Day</h2>
            <p className="text-slate-500 text-sm mb-3">Quote services are available Thursday & Friday only</p>
            <div className="flex gap-3">
              {['Thursday', 'Friday', 'Either'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setFormData({...formData, preferredDay: day})}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    formData.preferredDay === day
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Project Description */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Project Description *</h2>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Please describe the area you need cleaned, including approximate size, type of surface, and any specific concerns or stains..."
              className="min-h-[120px]"
              required
              data-testid="quote-description-input"
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-500" />
              Upload Photos *
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Please upload 1-5 photos of the area you need cleaned. This helps us provide an accurate quote.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                  <img src={photo.preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  data-testid="upload-photo-btn"
                >
                  <Upload size={24} />
                  <span className="text-xs mt-1">Add Photo</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-full text-lg"
            data-testid="submit-quote-btn"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <Send className="mr-2" size={20} />
                Submit Quote Request
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}
