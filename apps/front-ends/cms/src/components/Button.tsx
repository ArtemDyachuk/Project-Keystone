import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const getButtonStyles = (variant: string, size: string, isLoading: boolean): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 500,
    borderRadius: "6px",
    transition: "all 0.15s ease-in-out",
    border: "1px solid transparent",
    cursor: isLoading ? "default" : "pointer",
    fontFamily: "inherit",
    textDecoration: "none",
    opacity: isLoading ? 0.7 : 1
  };

  const sizeStyles = {
    sm: { padding: "6px 12px", fontSize: "14px" },
    md: { padding: "8px 16px", fontSize: "16px" },
    lg: { padding: "12px 24px", fontSize: "18px" }
  };

  const variantStyles = {
    primary: { backgroundColor: "#3b82f6", color: "white", borderColor: "#3b82f6" },
    secondary: { backgroundColor: "#6b7280", color: "white", borderColor: "#6b7280" },
    outline: { backgroundColor: "white", color: "#374151", borderColor: "#d1d5db" },
    danger: { backgroundColor: "#dc2626", color: "white", borderColor: "#dc2626" }
  };

  return {
    ...baseStyles,
    ...sizeStyles[size as keyof typeof sizeStyles],
    ...variantStyles[variant as keyof typeof variantStyles]
  };
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  children,
  disabled,
  style,
  ...props
}) => {
  const buttonStyle = {
    ...getButtonStyles(variant, size, isLoading),
    ...style
  };

  return (
    <button
      className={className}
      style={buttonStyle}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span style={{ 
            display: "inline-block", 
            width: "16px", 
            height: "16px", 
            marginRight: "8px",
            border: "2px solid transparent",
            borderTop: "2px solid currentColor",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
