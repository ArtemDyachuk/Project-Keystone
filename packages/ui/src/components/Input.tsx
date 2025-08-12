import React from "react";
import styles from "./Input.module.css";

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
  
  const inputClasses = [
    styles.input,
    error ? styles.inputError : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      
      {(helperText || error) && (
        <p className={error ? styles.errorText : styles.helperText}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
