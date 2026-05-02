import { motion } from 'framer-motion';
import { UserPlus, Bell, Search, FileText, TrendingUp, Award, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Create Your Profile",
      description: "Set up your company profile with detailed capabilities and preferences",
      icon: UserPlus,
      details: [
        "Add your NAICS codes and business size",
        "Upload past performance examples",
        "Set your target agencies and contract types",
        "Define your competitive advantages"
      ],
      color: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      number: "02",
      title: "Configure Smart Alerts",
      description: "Set up intelligent alerts to never miss relevant opportunities",
      icon: Bell,
      details: [
        "Choose keywords and search phrases",
        "Set budget ranges and locations",
        "Select set-aside preferences (8a, WOSB, etc.)",
        "Configure notification channels (email, SMS, Slack)"
      ],
      color: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      number: "03",
      title: "AI-Powered Matching",
      description: "Our AI scans thousands of contracts to find your best matches",
      icon: Search,
      details: [
        "Real-time scanning of SAM.gov and other portals",
        "98% accurate matching algorithm",
        "Priority scoring based on your profile",
        "Competitive analysis and win probability"
      ],
      color: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      number: "04",
      title: "Track & Win",
      description: "Monitor opportunities and submit winning proposals",
      icon: TrendingUp,
      details: [
        "Save and organize favorite opportunities",
        "Track deadlines and requirements",
        "Download RFP documents and attachments",
        "Access proposal templates and resources"
      ],
      color: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            How FedContractNotify Works
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-indigo-100 max-w-3xl mx-auto"
          >
            Your step-by-step guide to winning more federal contracts with AI-powered technology
          </motion.p>
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
              className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center mb-20 last:mb-0`}
            >
              {/* Icon & Number */}
              <div className="md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="w-40 h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center">
                    <step.icon className="w-16 h-16 text-indigo-600" />
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    {step.number}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="md:w-2/3">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{step.title}</h2>
                <p className="text-lg text-gray-600 mb-6">{step.description}</p>
                <ul className="grid md:grid-cols-2 gap-3">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Benefits</h2>
            <p className="text-xl text-gray-600">Why thousands of contractors choose FedContractNotify</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Award, title: "Increase Win Rate", description: "Our AI helps you focus on opportunities you're most likely to win" },
              { icon: Clock, title: "Save Time", description: "Stop manually searching multiple websites. Get relevant matches instantly" },
              { icon: TrendingUp, title: "Grow Revenue", description: "Access higher-value contracts and expand your federal portfolio" }
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Quick answers to common questions</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "How does the AI matching work?", a: "Our AI analyzes your profile, past performance, and preferences to match you with relevant contracts from SAM.gov and other sources with 98% accuracy." },
              { q: "What sources do you track?", a: "We track SAM.gov, FedBizOpps, agency-specific portals, and hundreds of other sources daily." },
              { q: "Can I try it for free?", a: "Yes! Our free plan includes 5 alerts per month with no credit card required." }
            ].map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gray-50 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-indigo-100 mb-8">Join thousands of successful federal contractors</p>
          <Link 
            to="/signup" 
            className="inline-flex items-center px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}