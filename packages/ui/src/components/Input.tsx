import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({ 
  label, 
  helperText, 
  error, 
  className,
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseStyles = "block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors";
  const normalStyles = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const errorStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
  
  const finalClassName = [
    baseStyles,
    error ? errorStyles : normalStyles,
    className
  ].filter(Boolean).join(" ");

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={finalClassName}
        {...props}
      />
      
      {(helperText || error) && (
        <p className={`text-sm ${error ? "text-red-600" : "text-gray-500"}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
