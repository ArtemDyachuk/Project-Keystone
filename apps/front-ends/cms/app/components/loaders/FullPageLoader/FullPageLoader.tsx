"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./FullPageLoader.module.css";

interface FullPageLoaderProps {
  isVisible: boolean;
  title?: string;
  description?: string;
}

export function FullPageLoader({ 
  isVisible, 
  title = "Loading...", 
  description 
}: FullPageLoaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isVisible || !mounted) return null;

  const content = (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.spinner}></div>
        <h3 className={styles.title}>{title}</h3>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
