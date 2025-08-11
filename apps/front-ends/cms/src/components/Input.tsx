import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  
  const containerStyle: React.CSSProperties = { width: "100%" };
  
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "4px"
  };
  
  const wrapperStyle: React.CSSProperties = { position: "relative", width: "100%" };
  
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: `8px ${rightIcon ? "40px" : "12px"} 8px ${leftIcon ? "40px" : "12px"}`,
    border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`,
    borderRadius: "6px",
    fontSize: "16px",
    color: "#111827",
    backgroundColor: "white",
    outline: "none"
  };
  
  const iconStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "20px",
    height: "20px",
    color: "#9ca3af",
    pointerEvents: leftIcon ? "none" : "auto"
  };
  
  const textStyle: React.CSSProperties = {
    marginTop: "4px",
    fontSize: "14px",
    color: error ? "#dc2626" : "#6b7280"
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      
      <div style={wrapperStyle}>
        {leftIcon && (
          <div style={{ ...iconStyle, left: "12px" }}>
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          style={inputStyle}
          {...props}
        />
        
        {rightIcon && (
          <div style={{ ...iconStyle, right: "12px" }}>
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && <p style={textStyle}>{error}</p>}
      {helperText && !error && <p style={textStyle}>{helperText}</p>}
    </div>
  );
};
