import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { 
  Trash2, 
  Warehouse, 
  Car, 
  Sparkles,
  Droplets,
  Plus,
  ArrowRight,
  Star,
  Home,
  HardHat
} from "lucide-react";

const ServicesPage = () => {
  const services = [
    {
      id: "recycling_bin",
      name: "Recycling Bin Cleaning",
      description: "Keep your bins fresh, clean, and odor-free with our professional power washing service. We thoroughly clean inside and out.",
      icon: Trash2,
      color: "bg-green-500",
      pricing: [
        { label: "1 Bin", price: 15 },
        { label: "2 Bins", price: 25 },
        { label: "Each Additional", price: 8 }
      ],
      features: ["Inside & outside cleaning", "Sanitization included", "Odor elimination"]
    },
    {
      id: "patio",
      name: "Patio Cleaning",
      description: "Transform your outdoor living space with our deep cleaning service. Remove dirt, mold, and grime to restore your patio's original beauty.",
      icon: Sparkles,
      color: "bg-blue-500",
      pricing: [
        { label: "Standard Patio", price: 30 }
      ],
      features: ["Deep cleaning", "Mold & mildew removal", "Surface restoration"]
    },
    {
      id: "driveway",
      name: "Driveway Cleaning",
      description: "Make your driveway look brand new. We remove oil stains, tire marks, and years of built-up grime.",
      icon: Car,
      color: "bg-orange-500",
      pricing: [
        { label: "Standard Driveway", price: 30 }
      ],
      features: ["Oil stain removal", "Tire mark cleaning", "Full surface wash"]
    },
    {
      id: "dumpster",
      name: "Restaurant Dumpster Cleaning",
      description: "Commercial-grade dumpster cleaning including the surrounding area. Perfect for restaurants, businesses, and apartment complexes.",
      icon: Warehouse,
      color: "bg-purple-500",
      pricing: [
        { label: "First Dumpster", price: 70 },
        { label: "Each Additional", price: 45 }
      ],
      features: ["Dumpster cleaning", "Surrounding area included", "Commercial grade"]
    },
    {
      id: "home_powerwash",
      name: "Home Power Washing",
      description: "Complete home exterior power washing service. We clean siding, decks, porches, fences, and more to restore your home's curb appeal.",
      icon: Home,
      color: "bg-cyan-500",
      pricing: [
        { label: "Custom Quote", price: null, isQuote: true }
      ],
      features: ["Siding cleaning", "Deck & porch washing", "Fence cleaning", "Custom assessment"],
      isQuote: true
    },
    {
      id: "construction_cleanup",
      name: "Construction Site Cleanup",
      description: "Professional post-construction cleaning and debris removal. We handle the mess so you can focus on the finished project.",
      icon: HardHat,
      color: "bg-amber-500",
      pricing: [
        { label: "Custom Quote", price: null, isQuote: true }
      ],
      features: ["Debris removal", "Surface cleaning", "Window washing", "Final walkthrough"],
      isQuote: true
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
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wide">Pricing & Details</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mt-2 uppercase">
            Our Services
          </h1>
          <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">
            Professional power washing services at competitive prices. 
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
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              data-testid={`service-detail-${service.id}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Service Info */}
                <div className="lg:col-span-2 p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <service.icon className="text-white" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{service.name}</h2>
                      <p className="text-slate-500 mt-2">{service.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-6">
                    {service.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-slate-50 p-8 md:p-10 border-t lg:border-t-0 lg:border-l border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Pricing</h3>
                  <div className="space-y-3">
                    {service.pricing.map((price, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-slate-700">{price.label}</span>
                        <span className="text-2xl font-extrabold text-blue-600 price-tag">
                          ${price.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scent Bomb Add-on */}
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
                <p className="text-slate-600">Deodorizing scent treatment for any service</p>
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
                Choose 2 days per month for regular cleanings and get a 5% discount on all services. 
                Charged per day of service. Perfect for restaurants, businesses, and communities.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Monthly Plan Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>5% off all services</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>Choose any 2 days per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
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

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Link to="/booking">
            <Button 
              data-testid="services-book-now-btn"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-12 rounded-full text-lg shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              Book Your Service <ArrowRight className="ml-2" size={20} />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ServicesPage;
