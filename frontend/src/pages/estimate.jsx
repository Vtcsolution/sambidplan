import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Estimate = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    services: [],
    scope: '',
    timeline: '',
    industry: [],
    goals: [],
    existingSystems: '',
    techStack: '',
    techStackDescription: '',
    projectNeeds: [],
    additionalDetails: '',
    contact: {
      fullName: '',
      email: '',
      company: '',
      phone: ''
    }
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const steps = [
    {
      title: "Service Type",
      fields: ['services'],
      component: (
        <ServicesStep 
          selectedServices={formData.services} 
          onChange={(services) => handleChange('services', services)}
          error={errors.services}
        />
      )
    },
    {
      title: "Project Scope",
      fields: ['scope'],
      component: (
        <ScopeStep 
          scope={formData.scope} 
          onChange={(scope) => handleChange('scope', scope)}
          error={errors.scope}
        />
      )
    },
    {
      title: "Timeline",
      fields: ['timeline'],
      component: (
        <TimelineStep 
          timeline={formData.timeline} 
          onChange={(timeline) => handleChange('timeline', timeline)}
          error={errors.timeline}
        />
      )
    },
    {
      title: "Industry",
      fields: ['industry'],
      component: (
        <IndustryStep 
          industry={formData.industry} 
          onChange={(industry) => handleChange('industry', industry)}
          error={errors.industry}
        />
      )
    },
    {
      title: "Project Goals",
      fields: ['goals'],
      component: (
        <GoalsStep 
          goals={formData.goals} 
          onChange={(goals) => handleChange('goals', goals)}
          error={errors.goals}
        />
      )
    },
    {
      title: "Existing Systems",
      fields: ['existingSystems', 'techStack', 'techStackDescription'],
      component: (
        <SystemsStep 
          existingSystems={formData.existingSystems} 
          techStack={formData.techStack}
          techStackDescription={formData.techStackDescription}
          onChange={(field, value) => handleChange(field, value)}
          errors={errors}
        />
      )
    },
    {
      title: "Project Needs",
      fields: ['projectNeeds'],
      component: (
        <NeedsStep 
          needs={formData.projectNeeds} 
          onChange={(needs) => handleChange('projectNeeds', needs)}
          error={errors.projectNeeds}
        />
      )
    },
    {
      title: "Additional Details",
      fields: ['additionalDetails'],
      component: (
        <DetailsStep 
          details={formData.additionalDetails} 
          onChange={(details) => handleChange('additionalDetails', details)}
          error={errors.additionalDetails}
        />
      )
    },
    {
      title: "Contact Information",
      fields: ['contact'],
      component: (
        <ContactStep 
          contact={formData.contact} 
          onChange={(field, value) => handleContactChange(field, value)}
          errors={errors.contact}
        />
      )
    }
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const validateStep = (step) => {
    const stepErrors = {};
    const stepFields = steps[step].fields;
    
    stepFields.forEach(field => {
      if (field === 'services' && formData.services.length === 0) {
        stepErrors.services = 'Please select at least one service';
      } 
      else if (field === 'scope' && !formData.scope) {
        stepErrors.scope = 'Please select project scope';
      }
      else if (field === 'timeline' && !formData.timeline) {
        stepErrors.timeline = 'Please select timeline';
      }
      else if (field === 'industry' && formData.industry.length === 0) {
        stepErrors.industry = 'Please select at least one industry';
      }
      else if (field === 'goals' && formData.goals.length === 0) {
        stepErrors.goals = 'Please select at least one goal';
      }
      else if (field === 'existingSystems' && !formData.existingSystems) {
        stepErrors.existingSystems = 'Please select an option';
      }
      else if (field === 'techStack' && formData.techStack === 'Yes' && !formData.techStackDescription) {
        stepErrors.techStackDescription = 'Please describe your tech stack preferences';
      }
      else if (field === 'projectNeeds' && formData.projectNeeds.length === 0) {
        stepErrors.projectNeeds = 'Please select at least one need';
      }
      else if (field === 'additionalDetails' && !formData.additionalDetails) {
        stepErrors.additionalDetails = 'Please provide some details';
      }
      else if (field === 'contact') {
        if (!formData.contact.fullName.trim()) {
          stepErrors.contact = {...stepErrors.contact, fullName: 'Full name is required'};
        }
        if (!formData.contact.email.trim()) {
          stepErrors.contact = {...stepErrors.contact, email: 'Email is required'};
        } else if (!/^\S+@\S+\.\S+$/.test(formData.contact.email)) {
          stepErrors.contact = {...stepErrors.contact, email: 'Email is invalid'};
        }
        if (!formData.contact.company.trim()) {
          stepErrors.contact = {...stepErrors.contact, company: 'Company name is required'};
        }
        if (!formData.contact.phone.trim()) {
          stepErrors.contact = {...stepErrors.contact, phone: 'Phone number is required'};
        }
      }
    });

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      // Submit form data
      console.log('Form submitted:', formData);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full text-center"
        >
          <div className="text-emerald-400 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Thank You for Your Submission!</h2>
          <p className="text-gray-300 mb-6">
            We've received your information and will provide you with a detailed cost estimate within 24 hours. 
            Our team will review your requirements and contact you if we need any additional details.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300"
          >
            Submit Another Request
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-extrabold pt-16 text-white sm:text-4xl">
            Get a Quick <span className="text-emerald-400">Cost Estimate</span> for Your Needs
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            No need for a call yet. Just answer a few questions, and we'll provide you with a clear and detailed cost estimate. 
            It's non-binding and completely free.
          </p>
        </motion.div>

        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="bg-gray-700 h-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-emerald-500"
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-center py-4 bg-gray-800">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index < currentStep) setCurrentStep(index);
                }}
                className={`mx-1 w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                  index <= currentStep 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-700 text-gray-400'
                } ${index < currentStep ? 'cursor-pointer hover:bg-emerald-600' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Form content */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold text-white mb-6">
                  {steps[currentStep].title}
                </h2>
                {steps[currentStep].component}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`py-2 px-6 rounded-lg font-medium transition-colors ${
                  currentStep === 0 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Back
              </button>
              
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const ServicesStep = ({ selectedServices, onChange, error }) => {
  const services = [
    "API Development & Integration",
    "IT Consulting",
    "Custom Software Development",
    "IT Infrastructure Services",
    "Cybersecurity",
    "IT Support",
    "Data Analytics",
    "Mobile App Development",
    "Database Development",
    "Project Management",
    "DevOps Services",
    "Software Testing & QA",
    "Digital Transformation",
    "UI/UX Design",
    "Embedded Systems Development",
    "Web Application Development",
    "Enterprise Software Development",
    "Other"
  ];

  const toggleService = (service) => {
    if (selectedServices.includes(service)) {
      onChange(selectedServices.filter(s => s !== service));
    } else {
      onChange([...selectedServices, service]);
    }
  };

  return (
    <div>
      <p className="text-gray-300 mb-4">What type of service are you interested in?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service) => (
          <motion.div 
            key={service}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center"
          >
            <input
              type="checkbox"
              id={service}
              checked={selectedServices.includes(service)}
              onChange={() => toggleService(service)}
              className="hidden"
            />
            <label 
              htmlFor={service}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                selectedServices.includes(service)
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {service}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const ScopeStep = ({ scope, onChange, error }) => {
  const options = [
    { value: 'small', label: 'Small (e.g., a simple website or app)' },
    { value: 'medium', label: 'Medium (e.g., a more complex application with multiple features)' },
    { value: 'large', label: 'Large (e.g., an enterprise-level system or platform)' },
    { value: 'unsure', label: 'Not sure (I need help defining the scope)' }
  ];

  return (
    <div>
      <p className="text-gray-300 mb-4">What is the scope of your project?</p>
      
      <div className="space-y-3">
        {options.map((option) => (
          <motion.div 
            key={option.value}
            whileHover={{ scale: 1.01 }}
            className="flex items-center"
          >
            <input
              type="radio"
              id={option.value}
              name="scope"
              value={option.value}
              checked={scope === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <label 
              htmlFor={option.value}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                scope === option.value
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {option.label}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const TimelineStep = ({ timeline, onChange, error }) => {
  const options = [
    { value: '3months', label: 'Less than 3 months' },
    { value: '3-6months', label: '3-6 months' },
    { value: '6-12months', label: '6-12 months' },
    { value: '12+months', label: '12+ months' },
    { value: 'flexible', label: 'Flexible' }
  ];

  return (
    <div>
      <p className="text-gray-300 mb-4">What is your preferred timeline for this project?</p>
      
      <div className="space-y-3">
        {options.map((option) => (
          <motion.div 
            key={option.value}
            whileHover={{ scale: 1.01 }}
            className="flex items-center"
          >
            <input
              type="radio"
              id={option.value}
              name="timeline"
              value={option.value}
              checked={timeline === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <label 
              htmlFor={option.value}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                timeline === option.value
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {option.label}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const IndustryStep = ({ industry, onChange, error }) => {
  const industries = [
    "Banking",
    "Oil and gas",
    "E-Commerce",
    "Payments",
    "Education",
    "Professional services",
    "Engineering & Construction",
    "Public sector",
    "Entertainment",
    "Real estate",
    "Healthcare",
    "Retail and wholesale",
    "Information technologies",
    "Telecommunications",
    "Insurance",
    "Transportation",
    "Investment",
    "Utilities",
    "Lending",
    "Multi-industry",
    "Manufacturing",
    "Other"
  ];

  const toggleIndustry = (ind) => {
    if (industry.includes(ind)) {
      onChange(industry.filter(i => i !== ind));
    } else {
      onChange([...industry, ind]);
    }
  };

  return (
    <div>
      <p className="text-gray-300 mb-4">What is your industry?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {industries.map((ind) => (
          <motion.div 
            key={ind}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center"
          >
            <input
              type="checkbox"
              id={ind}
              checked={industry.includes(ind)}
              onChange={() => toggleIndustry(ind)}
              className="hidden"
            />
            <label 
              htmlFor={ind}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                industry.includes(ind)
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {ind}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const GoalsStep = ({ goals, onChange, error }) => {
  const goalOptions = [
    "Increase efficiency",
    "Improve customer experience",
    "Reduce costs",
    "Enhance security",
    "Drive innovation",
    "Expand market reach",
    "Other"
  ];

  const toggleGoal = (goal) => {
    if (goals.includes(goal)) {
      onChange(goals.filter(g => g !== goal));
    } else {
      onChange([...goals, goal]);
    }
  };

  return (
    <div>
      <p className="text-gray-300  mb-4">What are your main goals for this project?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {goalOptions.map((goal) => (
          <motion.div 
            key={goal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center"
          >
            <input
              type="checkbox"
              id={goal}
              checked={goals.includes(goal)}
              onChange={() => toggleGoal(goal)}
              className="hidden"
            />
            <label 
              htmlFor={goal}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                goals.includes(goal)
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {goal}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const SystemsStep = ({ existingSystems, techStack, techStackDescription, onChange, errors }) => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-300 mb-4">Do you have any existing systems or technologies that need to be integrated?</p>
        
        <div className="flex space-x-4">
          {['Yes', 'No', 'Not sure'].map((option) => (
            <motion.div 
              key={option}
              whileHover={{ scale: 1.02 }}
              className="flex items-center"
            >
              <input
                type="radio"
                id={`systems-${option}`}
                name="existingSystems"
                value={option}
                checked={existingSystems === option}
                onChange={() => onChange('existingSystems', option)}
                className="hidden"
              />
              <label 
                htmlFor={`systems-${option}`}
                className={`cursor-pointer px-4 py-2 rounded-lg border ${
                  existingSystems === option
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
                } transition-colors`}
              >
                {option}
              </label>
            </motion.div>
          ))}
        </div>
        
        {errors.existingSystems && <p className="mt-2 text-red-400 text-sm">{errors.existingSystems}</p>}
      </div>

      <div>
        <p className="text-gray-300 mb-4">Do you have tech stack preferences?</p>
        
        <div className="flex space-x-4 mb-4">
          {['No', 'Yes'].map((option) => (
            <motion.div 
              key={option}
              whileHover={{ scale: 1.02 }}
              className="flex items-center"
            >
              <input
                type="radio"
                id={`techStack-${option}`}
                name="techStack"
                value={option}
                checked={techStack === option}
                onChange={() => onChange('techStack', option)}
                className="hidden"
              />
              <label 
                htmlFor={`techStack-${option}`}
                className={`cursor-pointer px-4 py-2 rounded-lg border ${
                  techStack === option
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
                } transition-colors`}
              >
                {option}
              </label>
            </motion.div>
          ))}
        </div>
        
        {techStack === 'Yes' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label htmlFor="techStackDescription" className="block text-gray-300 mb-2">
              Please describe your tech stack preferences
            </label>
            <textarea
              id="techStackDescription"
              value={techStackDescription}
              onChange={(e) => onChange('techStackDescription', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
              rows={3}
              placeholder="e.g., React, Node.js, MongoDB..."
            />
            {errors.techStackDescription && <p className="mt-2 text-red-400 text-sm">{errors.techStackDescription}</p>}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const NeedsStep = ({ needs, onChange, error }) => {
  const needOptions = [
    "From-scratch development",
    "Delivery of new features",
    "UI design/redesign",
    "Modernization/upgrade",
    "Migration to a new platform/tech stack",
    "Troubleshooting",
    "Consultation",
    "Other"
  ];

  const toggleNeed = (need) => {
    if (needs.includes(need)) {
      onChange(needs.filter(n => n !== need));
    } else {
      onChange([...needs, need]);
    }
  };

  return (
    <div>
      <p className="text-gray-300 mb-4">What does your project need?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {needOptions.map((need) => (
          <motion.div 
            key={need}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center"
          >
            <input
              type="checkbox"
              id={need}
              checked={needs.includes(need)}
              onChange={() => toggleNeed(need)}
              className="hidden"
            />
            <label 
              htmlFor={need}
              className={`flex-1 cursor-pointer p-3 rounded-lg border ${
                needs.includes(need)
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
              } transition-colors`}
            >
              {need}
            </label>
          </motion.div>
        ))}
      </div>
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const DetailsStep = ({ details, onChange, error }) => {
  return (
    <div>
      <p className="text-gray-300 mb-4">You can share any details about your request.</p>
      
      <textarea
        value={details}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
        rows={6}
        placeholder="Describe your project requirements, challenges, or any other relevant information..."
      />
      
      {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const ContactStep = ({ contact, onChange, errors }) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-gray-300 mb-2">Full name</label>
        <input
          type="text"
          id="fullName"
          value={contact.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
          placeholder="John Doe"
        />
        {errors?.fullName && <p className="mt-2 text-red-400 text-sm">{errors.fullName}</p>}
      </div>
      
      <div>
        <label htmlFor="email" className="block text-gray-300 mb-2">Work email</label>
        <input
          type="email"
          id="email"
          value={contact.email}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
          placeholder="john@company.com"
        />
        {errors?.email && <p className="mt-2 text-red-400 text-sm">{errors.email}</p>}
      </div>
      
      <div>
        <label htmlFor="company" className="block text-gray-300 mb-2">Company name</label>
        <input
          type="text"
          id="company"
          value={contact.company}
          onChange={(e) => onChange('company', e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
          placeholder="Company Inc."
        />
        {errors?.company && <p className="mt-2 text-red-400 text-sm">{errors.company}</p>}
      </div>
      
      <div>
        <label htmlFor="phone" className="block text-gray-300 mb-2">Phone number</label>
        <input
          type="tel"
          id="phone"
          value={contact.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
          placeholder="+1 (123) 456-7890"
        />
        {errors?.phone && <p className="mt-2 text-red-400 text-sm">{errors.phone}</p>}
      </div>
    </div>
  );
};

export default Estimate;