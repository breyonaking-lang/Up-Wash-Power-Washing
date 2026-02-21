import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { 
  Trash2, 
  Warehouse, 
  Car, 
  Sparkles,
  Plus,
  Minus,
  ArrowRight
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
        { label: "Dumpster + Area", price: 120 },
        { label: "Scent Bomb (Add-on)", price: 3 }
      ],
      features: ["Dumpster cleaning", "Surrounding area included", "Deodorizing available"]
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
                Save 10%
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-4">
                Monthly Cleaning Plans
              </h2>
              <p className="text-slate-300 text-lg">
                Schedule regular cleanings twice a week and get a 10% discount on all services. 
                Perfect for restaurants, businesses, and communities.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Monthly Plan Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>10% off all services</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>Twice weekly cleaning</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>Priority scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <Plus className="text-green-400 flex-shrink-0" size={20} />
                  <span>Flexible service options</span>
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
