import { motion } from 'framer-motion';
import { Target, Heart, Lightbulb, Users, Shield, TrendingUp, Award, Globe, ArrowRight } from 'lucide-react';

export default function About() {
  const values = [
    { icon: Target, title: "Mission-Driven", description: "Democratizing access to federal contracting opportunities" },
    { icon: Heart, title: "Customer First", description: "Your success is our top priority" },
    { icon: Lightbulb, title: "Innovation", description: "Leveraging AI to solve real problems" },
    { icon: Shield, title: "Trust & Security", description: "Enterprise-grade security for your data" }
  ];

  const team = [
    { name: "John Smith", role: "CEO & Founder", image: "https://via.placeholder.com/150", bio: "Former federal procurement officer" },
    { name: "Emily Chen", role: "CTO", image: "https://via.placeholder.com/150", bio: "AI & Machine Learning expert" },
    { name: "Michael Rodriguez", role: "Head of Product", image: "https://via.placeholder.com/150", bio: "15+ years in GovTech" }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Empowering Federal Contractors with AI
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-indigo-100 max-w-3xl mx-auto"
          >
            We're on a mission to help every qualified contractor discover and win federal opportunities
          </motion.p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Founded in 2024, FedContractNotify emerged from a simple observation: federal contracting opportunities 
                were scattered across multiple platforms, making it difficult for contractors to find relevant opportunities.
              </p>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Our team of former procurement officers, AI specialists, and software engineers came together to build 
                a solution that would level the playing field for federal contractors of all sizes.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Today, we're proud to have helped over 500 contractors discover and win federal contracts worth billions 
                of dollars. But we're just getting started.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">500+</div>
                  <div className="text-gray-600">Active Contractors</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">10K+</div>
                  <div className="text-gray-600">Contracts Found</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">$2.5B+</div>
                  <div className="text-gray-600">Contract Value</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">98%</div>
                  <div className="text-gray-600">Match Accuracy</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {values.map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-gray-600">Experts dedicated to your success</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-indigo-600 mb-2">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Contracting Success?</h2>
          <a href="/signup" className="inline-flex items-center px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100">
            Get Started Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}