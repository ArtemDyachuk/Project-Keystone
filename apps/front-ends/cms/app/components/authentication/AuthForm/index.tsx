import React from "react";
import styles from "./AuthForm.module.css";

interface AuthFormProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthForm({ children, title, subtitle }: AuthFormProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
