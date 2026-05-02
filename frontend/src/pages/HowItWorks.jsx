import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Bell,
  Search,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Play,
  Shield,
  Clock,
  Award,
  Target,
  BarChart,
  FileText,
  Mail,
  MessageCircle,
  Zap
} from 'lucide-react';

export default function HowItWorks() {
  const [activeVideo, setActiveVideo] = useState(false);

  const steps = [
    {
      number: "01",
      title: "Create Your Profile",
      description: "Set up your company profile with detailed capabilities and preferences to get personalized matches.",
      icon: UserPlus,
      color: "blue",
      details: [
        "Add your NAICS codes and business size",
        "Upload past performance examples",
        "Set your target agencies and contract types",
        "Define your competitive advantages"
      ],
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3"
    },
    {
      number: "02",
      title: "Configure Smart Alerts",
      description: "Set up intelligent alerts to never miss relevant opportunities that match your criteria.",
      icon: Bell,
      color: "green",
      details: [
        "Choose keywords and search phrases",
        "Set budget ranges and locations",
        "Select set-aside preferences (8a, WOSB, etc.)",
        "Configure notification channels (email, SMS, Slack)"
      ],
      image: "https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-4.0.3"
    },
    {
      number: "03",
      title: "AI-Powered Matching",
      description: "Our advanced AI scans thousands of contracts daily to find your best opportunities.",
      icon: Search,
      color: "purple",
      details: [
        "Real-time scanning of SAM.gov and other portals",
        "98% accurate matching algorithm",
        "Priority scoring based on your profile",
        "Competitive analysis and win probability"
      ],
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3"
    },
    {
      number: "04",
      title: "Track & Win",
      description: "Monitor opportunities, prepare proposals, and win federal contracts with confidence.",
      icon: TrendingUp,
      color: "orange",
      details: [
        "Save and organize favorite opportunities",
        "Track deadlines and requirements",
        "Download RFP documents and attachments",
        "Access proposal templates and resources"
      ],
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3"
    }
  ];

  const benefits = [
    { icon: Zap, title: "Save Time", description: "Stop manually searching multiple websites. Get relevant matches instantly." },
    { icon: Target, title: "Increase Win Rate", description: "Focus on opportunities you're most likely to win with AI insights." },
    { icon: TrendingUp, title: "Grow Revenue", description: "Access higher-value contracts and expand your federal portfolio." },
    { icon: Shield, title: "Stay Compliant", description: "Ensure all opportunities match your certifications and set-asides." },
    { icon: Clock, title: "Real-time Alerts", description: "Get notified immediately when new opportunities appear." },
    { icon: BarChart, title: "Track Performance", description: "Monitor your win rates and optimize your strategy." }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, Tech Solutions Inc.",
      content: "The step-by-step process made it incredibly easy to get started. We found our first contract within a week!",
      rating: 5,
      company: "Tech Solutions Inc."
    },
    {
      name: "Michael Chen",
      role: "President, Chen Consulting",
      content: "The AI matching is spot-on. We've saved countless hours and increased our win rate by 40%.",
      rating: 5,
      company: "Chen Consulting"
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-6">
              <Play className="w-4 h-4 mr-2" />
              <span className="text-sm">Get started in 4 simple steps</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How FedContractNotify Works
            </h1>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Your step-by-step guide to winning more federal contracts with AI-powered technology
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center mb-20 last:mb-0`}
            >
              {/* Content */}
              <div className="lg:w-1/2">
                <div className="mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-${step.color}-100 rounded-2xl mb-4`}>
                    <step.icon className={`w-8 h-8 text-${step.color}-600`} />
                  </div>
                  <div className="text-5xl font-bold text-gray-200 mb-2">{step.number}</div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{step.title}</h2>
                  <p className="text-lg text-gray-600 mb-6">{step.description}</p>
                </div>
                <ul className="space-y-3">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image */}
              <div className="lg:w-1/2">
                <div className="relative rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Watch a Quick Demo</h2>
            <p className="text-xl text-gray-600">
              See how FedContractNotify works in action
            </p>
          </div>
          
          <div className="relative rounded-2xl overflow-hidden shadow-xl cursor-pointer group">
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c2236a9a?ixlib=rb-4.0.3"
              alt="Video thumbnail"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-all">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-indigo-600 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Contractors Love Us</h2>
            <p className="text-xl text-gray-600">
              Join thousands of successful federal contractors
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Success Stories</h2>
            <p className="text-xl text-gray-600">
              Real results from real contractors
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-sm"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

     
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of successful federal contractors using FedContractNotify
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
            >
              Contact Sales
            </Link>
          </div>
          <p className="mt-4 text-indigo-200 text-sm">
            Free plan includes 5 alerts/month • No credit card required
          </p>
        </div>
      </section>
    </div>
  );
}

// Helper component for Star ratings
function Star({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}