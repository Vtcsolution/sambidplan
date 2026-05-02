import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Bell, 
  Search, 
  Brain, 
  TrendingUp, 
  Shield, 
  Clock, 
  CheckCircle,
  Star,
  Users,
  Award,
  Zap
} from 'lucide-react';

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3')] bg-cover bg-center opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-6">
              <Zap className="w-4 h-4 mr-2 text-yellow-400" />
              <span className="text-sm">AI-Powered Contract Discovery</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              Never Miss a Federal Contract Again
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 mb-8 leading-relaxed">
              AI-powered platform helping federal contractors discover, track, and win opportunities worth billions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/how-it-works" 
                className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl font-semibold transition-all duration-200 border border-white/20"
              >
                Watch Demo
              </Link>
            </div>
            <p className="mt-6 text-indigo-200 text-sm">No credit card required • Free forever plan available</p>
          </motion.div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm uppercase tracking-wide mb-6">Trusted by leading federal contractors</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            <span className="text-xl font-semibold text-gray-400">BAE Systems</span>
            <span className="text-xl font-semibold text-gray-400">Lockheed Martin</span>
            <span className="text-xl font-semibold text-gray-400">Northrop Grumman</span>
            <span className="text-xl font-semibold text-gray-400">Boeing</span>
            <span className="text-xl font-semibold text-gray-400">Raytheon</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "10,000+", label: "Contracts Tracked", icon: TrendingUp },
              { value: "$2.5B+", label: "Contract Value", icon: Award },
              { value: "500+", label: "Active Contractors", icon: Users },
              { value: "98%", label: "Match Accuracy", icon: CheckCircle }
            ].map((stat, idx) => (
              <motion.div key={idx} variants={fadeInUp} className="text-center">
                <div className="flex justify-center mb-3">
                  <stat.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Federal Contractors
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to discover, track, and win federal contracts
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Bell,
                title: "Smart Alerts",
                description: "Real-time notifications for matching opportunities based on your NAICS codes and past performance",
                features: ["Instant email alerts", "SMS notifications", "Slack integration"]
              },
              {
                icon: Search,
                title: "Contract Discovery",
                description: "Comprehensive search across SAM.gov, FedBizOpps, and agency-specific portals",
                features: ["Daily updates", "Advanced filters", "Historical data"]
              },
              {
                icon: Brain,
                title: "AI Matching",
                description: "Smart recommendations using machine learning to find your best-fit opportunities",
                features: ["98% accuracy", "Competitive analysis", "Win probability"]
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100"
              >
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                  <feature.icon className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((feat, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-500">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple Three-Step Process
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, start winning contracts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Profile", description: "Set up your company profile with NAICS codes and capabilities" },
              { step: "02", title: "Set Alerts", description: "Configure smart alerts for your target opportunities" },
              { step: "03", title: "Win Contracts", description: "Get matched and submit winning proposals" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-6xl font-bold text-indigo-200 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/how-it-works" className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-700">
              Learn more about how it works
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Contractors Say
            </h2>
            <p className="text-xl text-gray-600">
              Join hundreds of successful federal contractors
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "CEO, Tech Solutions Inc.",
                content: "FedContractNotify helped us discover a $2.5M contract we would have missed. The AI matching is incredible!",
                rating: 5
              },
              {
                name: "Michael Chen",
                role: "President, Chen Consulting",
                content: "The alerts are instant and relevant. We've increased our win rate by 40% since using this platform.",
                rating: 5
              },
              {
                name: "David Williams",
                role: "Director, Williams Group",
                content: "Best investment we've made. The time savings alone are worth every penny.",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow"
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
      <section className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 py-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Federal Contracting Success?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of contractors already winning with FedContractNotify
          </p>
          <Link 
            to="/signup" 
            className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-4 text-indigo-200 text-sm">Free plan includes 5 alerts/month • No credit card required</p>
        </div>
      </section>
    </div>
  );
}