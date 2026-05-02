'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Rocket, GraduationCap, Heart, Globe, Zap,
  MapPin, Clock, DollarSign, Shield, Cloud, Code,
  ArrowRight, ChevronRight, Sparkles, Award, Building2,
  Mail, Linkedin, Twitter, Facebook, Instagram, FileText,
  CheckCircle, PlayCircle, Star, Target, Users2, Cpu,
  Briefcase, Home, Laptop, Coffee, Brain, HeartHandshake
} from 'lucide-react';

export default function Careers() {
  const [activeDepartment, setActiveDepartment] = useState('all');
  const [hoveredBenefit, setHoveredBenefit] = useState(null);

  const jobOpenings = [
    {
      id: 1,
      title: "Senior Cybersecurity Engineer",
      department: "security",
      type: "Full-time",
      location: "Washington, D.C.",
      remote: true,
      level: "Senior",
      salary: "$120,000 - $150,000",
      description: "Lead our Zero Trust implementation and protect critical federal infrastructure.",
      requirements: ["CISSP", "5+ years federal security", "Zero Trust experience"],
      featured: true,
      urgent: true
    },
    {
      id: 2,
      title: "Cloud Solutions Architect",
      department: "cloud",
      type: "Full-time",
      location: "Remote",
      remote: true,
      level: "Senior",
      salary: "$130,000 - $160,000",
      description: "Design and implement scalable cloud solutions for government clients.",
      requirements: ["AWS/Azure certs", "FedRAMP experience", "3+ years cloud architecture"],
      featured: true
    },
    {
      id: 3,
      title: "IT Project Manager",
      department: "operations",
      type: "Full-time",
      location: "Tampa, FL",
      remote: false,
      level: "Mid-level",
      salary: "$90,000 - $120,000",
      description: "Manage federal IT projects from conception to delivery.",
      requirements: ["PMP certification", "Security clearance", "Agile experience"],
      featured: false
    },
    {
      id: 4,
      title: "DevSecOps Engineer",
      department: "engineering",
      type: "Full-time",
      location: "San Antonio, TX",
      remote: true,
      level: "Mid-level",
      salary: "$110,000 - $140,000",
      description: "Bridge development and security in our CI/CD pipelines.",
      requirements: ["Kubernetes", "Docker", "Security automation"],
      featured: false
    },
    {
      id: 5,
      title: "Federal Compliance Analyst",
      department: "compliance",
      type: "Full-time",
      location: "Washington, D.C.",
      remote: false,
      level: "Junior",
      salary: "$75,000 - $95,000",
      description: "Ensure adherence to federal security standards and regulations.",
      requirements: ["NIST knowledge", "Documentation skills", "Attention to detail"],
      featured: false
    },
    {
      id: 6,
      title: "IT Support Specialist",
      department: "support",
      type: "Contract",
      location: "Remote",
      remote: true,
      level: "Junior",
      salary: "$60,000 - $80,000",
      description: "Provide technical support for federal agency end-users.",
      requirements: ["CompTIA Security+", "Customer service", "Troubleshooting"],
      featured: false
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "Competitive Compensation",
      description: "Industry-leading salaries with performance bonuses and equity options.",
      features: ["Above-market salaries", "Annual bonuses", "Stock options", "Retirement matching"]
    },
    {
      icon: GraduationCap,
      title: "Professional Growth",
      description: "Continuous learning with certifications, training, and career advancement paths.",
      features: ["Certification reimbursement", "Tech conference budget", "Mentorship programs", "Promotion tracks"]
    },
    {
      icon: Home,
      title: "Flexible Work",
      description: "Remote, hybrid, and flexible scheduling to support work-life balance.",
      features: ["Remote-first culture", "Flexible hours", "Co-working stipends", "Results-oriented work"]
    },
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health benefits and wellness programs for you and your family.",
      features: ["Medical/dental/vision", "Mental health support", "Gym memberships", "Wellness stipends"]
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "Work on projects that matter, serving federal agencies and critical infrastructure.",
      features: ["Mission-driven work", "Federal projects", "National security impact", "Public service"]
    },
    {
      icon: Users,
      title: "Inclusive Culture",
      description: "Diverse, collaborative environment where every voice is valued and heard.",
      features: ["DEI initiatives", "Employee resource groups", "Inclusive leadership", "Community events"]
    }
  ];

  const departments = [
    { id: 'all', name: 'All Departments', count: jobOpenings.length, icon: Building2 },
    { id: 'security', name: 'Cybersecurity', count: jobOpenings.filter(job => job.department === 'security').length, icon: Shield },
    { id: 'cloud', name: 'Cloud Engineering', count: jobOpenings.filter(job => job.department === 'cloud').length, icon: Cloud },
    { id: 'engineering', name: 'Software Engineering', count: jobOpenings.filter(job => job.department === 'engineering').length, icon: Code },
    { id: 'operations', name: 'IT Operations', count: jobOpenings.filter(job => job.department === 'operations').length, icon: Cpu },
    { id: 'compliance', name: 'Compliance', count: jobOpenings.filter(job => job.department === 'compliance').length, icon: FileText },
    { id: 'support', name: 'Technical Support', count: jobOpenings.filter(job => job.department === 'support').length, icon: Users2 }
  ];

  const cultureValues = [
    {
      icon: Target,
      title: "Mission First",
      description: "We prioritize impact and purpose in everything we do.",
      color: "from-red-500 to-orange-500"
    },
    {
      icon: HeartHandshake,
      title: "Collaborative Spirit",
      description: "We believe in the power of teamwork and shared success.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Rocket,
      title: "Innovation Driven",
      description: "We embrace change and continuously push boundaries.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Integrity Always",
      description: "We operate with transparency, ethics, and trust.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Brain,
      title: "Continuous Learning",
      description: "We grow together through knowledge sharing and development.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Zap,
      title: "Excellence in Execution",
      description: "We deliver quality and reliability in every project.",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const filteredJobs = jobOpenings.filter(job => 
    activeDepartment === 'all' || job.department === activeDepartment
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section - Geometric Design */}
      <section className="relative py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24px,rgba(255,255,255,0.1)_25px),linear-gradient(180deg,transparent_24px,rgba(255,255,255,0.1)_25px)] bg-[size:25px_25px]" />
        </div>

        <div className="relative z-10 container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium mb-8 border border-white/20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              >
                <Sparkles className="w-4 h-4" />
                We're Hiring - Join Our Growing Team
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Build Your
                <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Career With Purpose
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Join a team that values <strong className="text-cyan-400">innovation, collaboration, and excellence</strong>. 
                We're shaping the future of technology in the public and private sectors while making a real impact on national security and critical infrastructure.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  className="group bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-cyan-600 transition-all duration-300 flex items-center gap-3 shadow-lg shadow-cyan-500/25"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Current Openings
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  className="group border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-3"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Submit Your Resume
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </motion.button>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-8 mt-12">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">40+</div>
                  <div className="text-sm text-cyan-200">Open Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">15+</div>
                  <div className="text-sm text-cyan-200">States</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">85%</div>
                  <div className="text-sm text-cyan-200">Remote Roles</div>
                </div>
              </div>
            </motion.div>

            {/* Team Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((item) => (
                  <motion.div
                    key={item}
                    className={`p-6 rounded-2xl backdrop-blur-md border border-white/20 ${
                      item === 1 ? 'bg-cyan-500/20' :
                      item === 2 ? 'bg-blue-500/20' :
                      item === 3 ? 'bg-purple-500/20' :
                      'bg-pink-500/20'
                    }`}
                    whileHover={{ y: -5, scale: 1.02 }}
                  >
                    <div className="text-white text-center">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold mb-1">Team Member</h3>
                      <p className="text-sm opacity-80">Department</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Floating Elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400/20 rounded-full backdrop-blur-md border border-yellow-400/30 flex items-center justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Award className="w-8 h-8 text-yellow-400" />
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 w-20 h-20 bg-green-400/20 rounded-full backdrop-blur-md border border-green-400/30 flex items-center justify-center"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              >
                <Rocket className="w-6 h-6 text-green-400" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Culture & Values */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Culture</span> & Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're building more than a company - we're building a community of innovators and problem-solvers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {cultureValues.map((value, index) => (
              <motion.div
                key={value.title}
                className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-500"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} p-3 mb-6 text-white shadow-lg`}>
                  <value.icon className="w-full h-full" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-2xl transition-all duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - Interactive */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Why You'll <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Love Working Here</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We invest in our team's success with comprehensive benefits and growth opportunities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-500 cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onHoverStart={() => setHoveredBenefit(benefit.title)}
                onHoverEnd={() => setHoveredBenefit(null)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <benefit.icon className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {benefit.title}
                </h3>
                
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {benefit.description}
                </p>

                {/* Features List - Animated on Hover */}
                <div className="space-y-2">
                  {benefit.features.map((feature, idx) => (
                    <motion.div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-600"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ 
                        opacity: hoveredBenefit === benefit.title ? 1 : 0.7,
                        x: hoveredBenefit === benefit.title ? 0 : -10
                      }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </motion.div>
                  ))}
                </div>

                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Openings - Interactive Filter */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            className="flex items-center justify-between mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Current <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Openings</span>
              </h2>
              <p className="text-xl text-gray-600">Find your perfect role and join our mission-driven team</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{jobOpenings.length}</div>
              <div className="text-sm text-gray-600">Open Positions</div>
            </div>
          </motion.div>

          {/* Department Filter */}
          <div className="flex flex-wrap gap-4 mb-12">
            {departments.map((dept) => (
              <motion.button
                key={dept.id}
                onClick={() => setActiveDepartment(dept.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
                  activeDepartment === dept.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <dept.icon className="w-5 h-5" />
                {dept.name}
                <span className={`px-2 py-1 rounded-full text-sm ${
                  activeDepartment === dept.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {dept.count}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Jobs Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                className="group bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-500"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                        {job.remote && <span className="text-green-600 ml-1">• Remote</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  {job.featured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4 leading-relaxed">
                  {job.description}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-bold text-blue-600">{job.salary}</div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {job.level}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {job.requirements.slice(0, 2).map((req, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {req}
                    </span>
                  ))}
                  {job.requirements.length > 2 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      +{job.requirements.length - 2} more
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                    Apply Now
                  </button>
                  <button className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* No Jobs Message */}
          {filteredJobs.length === 0 && (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2">No Open Positions</h3>
              <p className="text-gray-500 mb-6">We don't have any openings in this department right now.</p>
              <button 
                className="text-blue-600 hover:text-blue-700 font-semibold"
                onClick={() => setActiveDepartment('all')}
              >
                View All Openings
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Final CTA - Different Design */}
      <section className="py-24 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white/5 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Ready to Build
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Something Amazing?
              </span>
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join our team of innovators and help shape the future of federal technology and cybersecurity.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <motion.button
                className="bg-cyan-500 text-white px-12 py-5 rounded-xl font-bold text-lg hover:bg-cyan-600 transition-colors duration-300 flex items-center gap-3 shadow-lg shadow-cyan-500/25"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                View All Open Positions
                <Rocket className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="border-2 border-white text-white px-8 py-5 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Submit General Application
                <Mail className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}