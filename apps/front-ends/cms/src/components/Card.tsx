import React from "react";

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: "default" | "outlined" | "elevated";
  padding?: "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = "",
  variant = "default",
  padding = "md"
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: "8px",
    overflow: "hidden"
  };
  
  const variantStyles = {
    default: { border: "1px solid #e5e7eb" },
    outlined: { border: "2px solid #d1d5db" },
    elevated: { border: "1px solid #f3f4f6", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }
  };
  
  const paddingStyles = {
    sm: { padding: "16px" },
    md: { padding: "24px" },
    lg: { padding: "32px" }
  };
  
  const cardStyle: React.CSSProperties = {
    ...baseStyle,
    ...variantStyles[variant],
    ...paddingStyles[padding]
  };
  
  const headerStyle: React.CSSProperties = { marginBottom: "16px" };
  const titleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 600, color: "#111827", margin: "0 0 4px 0" };
  const subtitleStyle: React.CSSProperties = { fontSize: "14px", color: "#6b7280", margin: "0" };

  return (
    <div style={cardStyle} className={className}>
      {(title || subtitle) && (
        <div style={headerStyle}>
          {title && <h3 style={titleStyle}>{title}</h3>}
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
