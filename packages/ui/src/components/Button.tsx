import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ 
  variant = "primary", 
  size = "md", 
  isLoading = false, 
  children, 
  disabled,
  className,
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantStyles = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 focus:ring-gray-500",
    outline: "bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500"
  };
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base", 
    lg: "px-6 py-3 text-lg"
  };
  
  const finalClassName = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    (disabled || isLoading) && "opacity-50 cursor-not-allowed",
    className
  ].filter(Boolean).join(" ");

  return (
    <button 
      className={finalClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
