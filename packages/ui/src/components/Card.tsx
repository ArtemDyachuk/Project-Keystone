import React from "react";
import styles from "./Card.module.css";

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
  const classes = [
    styles.card,
    styles[variant],
    styles[padding],
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
