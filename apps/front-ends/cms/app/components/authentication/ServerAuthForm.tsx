"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import styles from "./ServerAuthForm.module.css";

interface ServerAuthFormProps {
  mode: "signin" | "signup";
}

export function ServerAuthForm({ mode }: ServerAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;
      
      if (mode === "signin") {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, name);
      }

      if (result.success) {
        // Redirect to dashboard on success
        router.push("/dashboard");
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-form"]}>
      <h2>{mode === "signin" ? "Sign In" : "Sign Up"}</h2>
      
      {error && (
        <div className={styles["error-message"]}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className={styles["form-group"]}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>
        )}

        <div className={styles["form-group"]}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className={styles["form-group"]}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className={styles["submit-button"]}
        >
          {loading ? "Processing..." : (mode === "signin" ? "Sign In" : "Sign Up")}
        </button>
      </form>

      <div className={styles["form-footer"]}>
        {mode === "signin" ? (
          <p>
            Don't have an account?{" "}
            <button 
              onClick={() => router.push("/signup")}
              className={styles["link-button"]}
            >
              Sign up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <button 
              onClick={() => router.push("/signin")}
              className={styles["link-button"]}
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
