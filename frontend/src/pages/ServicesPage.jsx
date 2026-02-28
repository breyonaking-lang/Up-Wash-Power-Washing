import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Trash2, 
  Warehouse, 
  Car, 
  Sparkles,
  Droplets,
  ArrowRight,
  Star,
  Home,
  HardHat,
  Building2,
  CheckCircle
} from "lucide-react";

const ServicesPage = () => {
  const navigate = useNavigate();
  
  const handleBookService = (serviceId, quantity = 1, isQuote = false) => {
    if (isQuote) {
      navigate(`/quote?service=${serviceId}`);
    } else {
      navigate(`/booking?service=${serviceId}&qty=${quantity}`);
    }
  };

  const services = [
    {
      id: "recycling_bin",
      name: "Recycling Bin Cleaning",
      description: "Our professional bin sanitization service eliminates bacteria, odors, and grime buildup. Using commercial-grade equipment and eco-friendly solutions, we thoroughly clean the interior and exterior of your bins, leaving them fresh and hygienic for your family's health.",
      icon: Trash2,
      color: "bg-green-500",
      pricing: [
        { label: "1 Bin", price: 15, qty: 1 },
        { label: "2 Bins", price: 25, qty: 2 },
        { label: "Each Additional", price: 8, qty: 3 }
      ],
      features: ["Interior & exterior deep clean", "Hospital-grade sanitization", "Odor elimination treatment", "Environmentally safe products"],
      availableDays: "Monday & Tuesday"
    },
    {
      id: "trash_bin_cleaning",
      name: "Trash Bin Cleaning",
      description: "Keep your trash bins fresh and sanitary with our professional cleaning service. We eliminate foul odors, bacteria, and residue buildup that attracts pests. A clean trash bin means a healthier home environment.",
      icon: Trash2,
      color: "bg-slate-600",
      pricing: [
        { label: "1 Bin", price: 15, qty: 1 },
        { label: "2 Bins", price: 25, qty: 2 },
        { label: "Each Additional", price: 8, qty: 3 }
      ],
      features: ["Interior & exterior deep clean", "Hospital-grade sanitization", "Odor elimination treatment", "Pest prevention"],
      availableDays: "Monday & Tuesday"
    },
    {
      id: "scent_bomb",
      name: "Scent Bomb",
      description: "Add a fresh, long-lasting fragrance to your freshly cleaned bins! Our scent bombs keep your bins smelling amazing for weeks. Perfect add-on for any bin cleaning service.",
      icon: Sparkles,
      color: "bg-pink-500",
      pricing: [
        { label: "Each", price: 3.5, qty: 1 }
      ],
      features: ["Long-lasting freshness", "Multiple scent options", "Eco-friendly formula", "Works with any bin"],
      availableDays: "Any day"
    },
    {
      id: "patio",
      name: "Patio Cleaning",
      description: "Transform your outdoor living space with our expert patio restoration service. We remove years of dirt, algae, mold, and weather stains using precision pressure washing techniques that protect your surface while delivering showroom-quality results.",
      icon: Sparkles,
      color: "bg-blue-500",
      pricing: [
        { label: "Standard Patio", price: 85, qty: 1 }
      ],
      features: ["Deep pressure washing", "Mold & mildew removal", "Surface protection treatment", "Enhances property value"],
      availableDays: "Wednesday - Friday"
    },
    {
      id: "driveway",
      name: "Driveway Cleaning",
      description: "Restore your driveway's original appearance with our comprehensive cleaning service. Our industrial equipment removes stubborn oil stains, tire marks, rust, and embedded dirt, dramatically improving your home's curb appeal and preventing long-term surface damage.",
      icon: Car,
      color: "bg-orange-500",
      pricing: [
        { label: "Standard Driveway", price: 85, qty: 1 }
      ],
      features: ["Oil & grease stain removal", "Tire mark elimination", "Concrete brightening", "Extends driveway lifespan"],
      availableDays: "Wednesday - Friday"
    },
    {
      id: "dumpster",
      name: "Restaurant Dumpster Cleaning",
      description: "Maintain health code compliance and eliminate pest attractions with our commercial dumpster cleaning service. We sanitize the entire dumpster area including surrounding concrete, removing grease, food residue, and odors that can harm your business reputation.",
      icon: Warehouse,
      color: "bg-purple-500",
      pricing: [
        { label: "First Dumpster", price: 85, qty: 1 },
        { label: "Each Additional", price: 45, qty: 2 }
      ],
      features: ["Health code compliant", "Pest prevention", "Grease trap area cleaning", "Scheduled maintenance available"],
      availableDays: "Wednesday - Friday"
    },
    {
      id: "home_powerwash",
      name: "Home Power Washing",
      description: "Protect your largest investment with our whole-home exterior cleaning service. Our trained technicians carefully clean siding, gutters, soffits, decks, and fences using appropriate pressure levels for each surface material, revealing the beauty hidden beneath years of buildup.",
      icon: Home,
      color: "bg-cyan-500",
      pricing: [
        { label: "Custom Quote", price: null, isQuote: true }
      ],
      features: ["Siding & gutter cleaning", "Deck & fence restoration", "Soft wash for delicate surfaces", "Free on-site assessment"],
      isQuote: true,
      availableDays: "Thursday & Friday"
    },
    {
      id: "construction_cleanup",
      name: "Construction Site Cleanup",
      description: "Get your project move-in ready with our post-construction cleaning expertise. We remove construction dust, debris, paint overspray, and adhesive residue from all surfaces, ensuring your finished project looks its absolute best for final inspection and client handover.",
      icon: HardHat,
      color: "bg-amber-500",
      pricing: [
        { label: "Custom Quote", price: null, isQuote: true }
      ],
      features: ["Debris & dust removal", "Window & glass cleaning", "Surface detailing", "Final inspection ready"],
      isQuote: true,
      availableDays: "Thursday & Friday"
    },
    {
      id: "commercial",
      name: "Commercial Properties",
      description: "Elevate your commercial property's appearance with our large-scale power washing solutions. We serve schools, apartment complexes, office buildings, and retail centers with flexible scheduling options that minimize disruption to your tenants and operations.",
      icon: Building2,
      color: "bg-indigo-500",
      pricing: [
        { label: "Custom Quote", price: null, isQuote: true }
      ],
      features: ["Schools & universities", "Apartment complexes", "Office buildings", "Flexible scheduling"],
      isQuote: true,
      availableDays: "Thursday & Friday"
    }
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Professional Power Washing</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mt-2 uppercase">
            Our Services
          </h1>
          <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">
            Expert cleaning solutions tailored to your property's needs. 
            Free travel within 15 miles of Burleson, TX.
          </p>
        </motion.div>

        {/* Services List */}
        <div className="space-y-8">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
              data-testid={`service-detail-${service.id}`}
              onClick={() => handleBookService(service.id, 1, service.isQuote)}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Service Info */}
                <div className="lg:col-span-2 p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <service.icon className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{service.name}</h2>
                    </div>
                  </div>
                  
                  {/* Professional Description */}
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {service.description}
                  </p>
                  
                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-600 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Click to Book indicator */}
                  <div className="mt-6 flex items-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={16} />
                    <span className="text-sm font-semibold">
                      {service.isQuote ? 'Click to request a quote' : 'Click to book this service'}
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className={`p-8 md:p-10 border-t lg:border-t-0 lg:border-l border-slate-100 ${service.isQuote ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Pricing</h3>
                  <div className="space-y-3">
                    {service.pricing.map((price, i) => (
                      <div 
                        key={i} 
                        className="flex justify-between items-center cursor-pointer hover:bg-white/50 p-2 rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookService(service.id, price.qty || 1, service.isQuote || price.isQuote);
                        }}
                      >
                        <span className="text-slate-700">{price.label}</span>
                        {price.isQuote ? (
                          <span className="text-xl font-bold text-amber-600">
                            Get Quote
                          </span>
                        ) : (
                          <span className="text-2xl font-extrabold text-blue-600 price-tag">
                            ${price.price}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {service.isQuote && (
                    <p className="text-sm text-amber-700 mt-4">
                      Contact us for a free custom quote based on your specific needs.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scent Bomb Add-on Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl border border-pink-100 p-8 md:p-10"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center">
                <Droplets className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Scent Bomb Add-on</h3>
                <p className="text-slate-600">Add a fresh scent treatment to any service during checkout</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-pink-600 price-tag">$3.50</span>
              <span className="text-slate-500 ml-2">each</span>
            </div>
          </div>
        </motion.div>

        {/* Monthly Plan Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Star className="inline mr-1" size={16} /> Save 5%
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-4">
                Monthly Subscription
              </h2>
              <p className="text-slate-300 text-lg">
                Choose your preferred days per month for regular cleanings and receive a 5% discount on all services. 
                Perfect for restaurants, businesses, and communities.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Monthly Plan Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                  <span>5% off all services</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                  <span>Flexible scheduling (1-6 days/month)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                  <span>Text message reminders</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Travel Fee Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 md:p-8"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-2">Service Area & Travel Fees</h3>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-slate-600">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <strong>Free:</strong> Within 15 miles of Burleson, TX
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <strong>Beyond 15 miles:</strong> $1 per additional mile
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ServicesPage;
