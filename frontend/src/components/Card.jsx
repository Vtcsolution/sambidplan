import React from 'react';

/**
 * Card Component - Reusable card with multiple variants and options
 * 
 * @param {string} variant - 'default' | 'elevated' | 'outlined' | 'flat'
 * @param {string} padding - 'none' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} hoverable - Adds hover effects
 * @param {boolean} clickable - Adds cursor pointer and onClick handler
 * @param {function} onClick - Click handler for clickable cards
 * @param {string} className - Additional CSS classes
 * @param {children} children - Card content
 */

export default function Card({ 
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  onClick,
  className = '',
  children
}) {
  // Variant styles
  const variants = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md',
    outlined: 'bg-transparent border-2 border-gray-200',
    flat: 'bg-gray-50 border border-gray-100',
  };

  // Padding sizes
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  // Hover effects
  const hoverEffects = hoverable 
    ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1' 
    : '';

  // Clickable styles
  const clickableStyles = clickable 
    ? 'cursor-pointer transition-all duration-200 hover:shadow-md active:scale-98' 
    : '';

  // Combine all classes
  const cardClasses = `
    rounded-lg 
    ${variants[variant]} 
    ${paddings[padding]} 
    ${hoverEffects} 
    ${clickableStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClasses} onClick={clickable ? onClick : undefined}>
      {children}
    </div>
  );
}

// Sub-component: Card Header
export function CardHeader({ children, className = '', border = true }) {
  return (
    <div className={`${border ? 'border-b border-gray-200 pb-4 mb-4' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Sub-component: Card Title
export function CardTitle({ children, className = '', as: Component = 'h3' }) {
  return (
    <Component className={`text-xl font-semibold text-gray-900 ${className}`}>
      {children}
    </Component>
  );
}

// Sub-component: Card Description
export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-gray-600 text-sm mt-1 ${className}`}>
      {children}
    </p>
  );
}

// Sub-component: Card Content
export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Sub-component: Card Footer
export function CardFooter({ children, className = '', border = true }) {
  return (
    <div className={`${border ? 'border-t border-gray-200 pt-4 mt-4' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Sub-component: Card Image
export function CardImage({ src, alt, className = '', position = 'top' }) {
  const positionClasses = {
    top: 'rounded-t-lg -mt-6 -mx-6 mb-4',
    bottom: 'rounded-b-lg -mb-6 -mx-6 mt-4',
    full: 'rounded-lg -m-6',
  };

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`w-full object-cover ${positionClasses[position]} ${className}`}
      style={{ maxHeight: '200px' }}
    />
  );
}

// Sub-component: Card Stats (for dashboard metrics)
export function CardStats({ stats = [] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}