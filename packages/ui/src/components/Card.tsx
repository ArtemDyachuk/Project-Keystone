import React from "react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "outlined" | "elevated";
  padding?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}

export function Card({ 
  title, 
  subtitle, 
  variant = "default", 
  padding = "md", 
  className,
  children 
}: CardProps) {
  const baseStyles = "rounded-lg border";
  
  const variantStyles = {
    default: "bg-white border-gray-200",
    outlined: "bg-white border-gray-300 border-2",
    elevated: "bg-white border-gray-200 shadow-lg"
  };
  
  const paddingStyles = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6"
  };
  
  const finalClassName = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={finalClassName}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
