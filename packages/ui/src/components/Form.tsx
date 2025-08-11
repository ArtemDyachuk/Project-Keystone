import React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const Form: React.FC<FormProps> = ({
  children,
  title,
  subtitle,
  className = "",
  onSubmit,
  ...props
}) => {
  const formStyle: React.CSSProperties = { width: "100%" };
  const headerStyle: React.CSSProperties = { marginBottom: "24px" };
  const titleStyle: React.CSSProperties = { fontSize: "24px", fontWeight: 700, color: "#111827", margin: "0 0 8px 0" };
  const subtitleStyle: React.CSSProperties = { fontSize: "16px", color: "#6b7280", margin: "0" };

  return (
    <form style={formStyle} className={className} onSubmit={onSubmit} {...props}>
      {(title || subtitle) && (
        <div style={headerStyle}>
          {title && <h2 style={titleStyle}>{title}</h2>}
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
      )}
      {children}
    </form>
  );
};

export interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className = ""
}) => {
  const fieldStyle: React.CSSProperties = { width: "100%", marginBottom: "16px" };
  
  return (
    <div style={fieldStyle} className={className}>
      {children}
    </div>
  );
};

export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  alignment?: "left" | "center" | "right" | "between";
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className = "",
  alignment = "right"
}) => {
  const alignmentStyles = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
    between: "space-between"
  };

  const actionsStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: alignmentStyles[alignment],
    gap: "12px",
    paddingTop: "16px"
  };

  return (
    <div style={actionsStyle} className={className}>
      {children}
    </div>
  );
};
