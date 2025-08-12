"use client";

import styles from './page.module.css';
import { Button, Card, Input, Form, FormField, FormActions } from "../../src/shared/ui";
import { useState } from "react";

export default function UITestPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Form submitted: ${JSON.stringify(formData, null, 2)}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          🎨 Shared UI Components Test
        </h1>
        
        <div className={styles.grid}>
          {/* Buttons Demo */}
          <Card title="Buttons" subtitle="Different button variants and sizes">
            <div className={styles.buttonSection}>
              <div className={styles.buttonRow}>
                <Button variant="primary" size="sm">Primary Small</Button>
                <Button variant="secondary" size="sm">Secondary Small</Button>
                <Button variant="outline" size="sm">Outline Small</Button>
              </div>
              <div className={styles.buttonRow}>
                <Button variant="primary">Primary Medium</Button>
                <Button variant="secondary">Secondary Medium</Button>
                <Button variant="outline">Outline Medium</Button>
              </div>
              <div className={styles.buttonRow}>
                <Button variant="primary" size="lg">Primary Large</Button>
                <Button variant="danger" size="lg">Danger Large</Button>
              </div>
              <div className={styles.buttonRow}>
                <Button variant="primary" isLoading>Loading...</Button>
                <Button variant="outline" disabled>Disabled</Button>
              </div>
            </div>
          </Card>

          {/* Form Demo */}
          <Card title="Form Components" subtitle="Inputs and form layout">
            <Form 
              title="Sample Form"
              subtitle="Testing form components"
              onSubmit={handleSubmit}
            >
              <FormField>
                <Input
                  label="Full Name"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  helperText="This will be used as your display name"
                />
              </FormField>

              <FormField>
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={formData.email && !formData.email.includes("@") ? "Please enter a valid email" : undefined}
                />
              </FormField>

              <FormActions alignment="between">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Submit Form
                </Button>
              </FormActions>
            </Form>
          </Card>

          {/* Card Variants Demo */}
          <Card title="Card Variants" subtitle="Different card styles" className={styles.cardVariantsSection}>
            <div className={styles.cardGrid}>
              <Card variant="default" padding="sm">
                <h4 className={styles.cardTitle}>Default Card</h4>
                <p className={styles.cardDescription}>
                  This is a default card with small padding.
                </p>
              </Card>
              
              <Card variant="outlined" padding="md">
                <h4 className={styles.cardTitle}>Outlined Card</h4>
                <p className={styles.cardDescription}>
                  This is an outlined card with medium padding.
                </p>
              </Card>
              
              <Card variant="elevated" padding="lg">
                <h4 className={styles.cardTitle}>Elevated Card</h4>
                <p className={styles.cardDescription}>
                  This is an elevated card with large padding.
                </p>
              </Card>
            </div>
          </Card>
        </div>

        <div className={styles.successSection}>
          <Card variant="elevated" className={styles.successCard}>
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>
                ✅ Shared UI Package Working!
              </h3>
              <p className={styles.successDescription}>
                The @keystone/ui package is successfully being used in the frontend.
              </p>
              <div className={styles.successAction}>
                <Button variant="primary" onClick={() => window.location.href = "/"}>
                  Back to Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
