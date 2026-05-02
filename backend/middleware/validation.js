import { body } from 'express-validator';

export const partnershipValidationRules = () => {
  return [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('company')
      .trim()
      .notEmpty().withMessage('Company name is required')
      .isLength({ min: 2, max: 200 }).withMessage('Company name must be between 2 and 200 characters'),
    
    body('budget')
      .notEmpty().withMessage('Budget range is required')
      .isIn(['5k-20k', '20k-50k', '50k-100k', '100k-500k', '500k+'])
      .withMessage('Invalid budget range'),
    
    body('description')
      .trim()
      .notEmpty().withMessage('Project description is required')
      .isLength({ min: 20, max: 5000 }).withMessage('Description must be between 20 and 5000 characters'),
    
    body('nda')
      .optional()
      .isBoolean().withMessage('NDA agreement must be a boolean value'),
    
    body('serviceType')
      .optional()
      .isIn([
        'AI-Powered Web Applications',
        'Enterprise AI SaaS Platforms',
        'Robotic Process Automation (RPA)',
        'Custom Machine Learning Solutions'
      ]).withMessage('Invalid service type'),
    
    body('partnershipTier')
      .optional()
      .isIn(['STRATEGIC PARTNERSHIP', 'PREMIUM PARTNERSHIP', 'ESSENTIAL PARTNERSHIP'])
      .withMessage('Invalid partnership tier'),
    
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
      .withMessage('Invalid phone number format'),
    
    body('website')
      .optional()
      .trim()
      .isURL().withMessage('Invalid website URL'),
    
    body('industry')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Industry must be less than 100 characters'),
    
    body('employees')
      .optional()
      .isIn(['1-10', '11-50', '51-200', '201-1000', '1000+'])
      .withMessage('Invalid employee range'),
    
    body('timeline')
      .optional()
      .isIn(['Immediate', '1-3 months', '3-6 months', '6+ months'])
      .withMessage('Invalid timeline'),
    
    body('referralSource')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Referral source must be less than 200 characters')
  ];
};