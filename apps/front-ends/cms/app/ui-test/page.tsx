"use client";

import styles from './page.module.css';
// import { Button, Card, Input, Form, FormField, FormActions } from "@keystone/ui";
// import { useState } from "react";

export default function UITestPage() {
  // Temporarily disabled state
  // const [formData, setFormData] = useState({
  //   name: "",
  //   email: ""
  // });

  // Temporarily disabled handlers
  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   alert(`Form submitted: ${JSON.stringify(formData, null, 2)}`);
  // };

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     [e.target.name]: e.target.value
  //   }));
  // };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          🎨 Shared UI Components Test
        </h1>
        
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>🚧 UI Components Temporarily Disabled</h2>
          <p>Working on fixing module resolution for @keystone/ui package.</p>
          <p>Database and backend integration is working correctly.</p>
          <button 
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer' 
            }}
            onClick={() => window.location.href = "/"}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
