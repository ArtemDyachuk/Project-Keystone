"use client";

import { useState, useEffect } from 'react';
import styles from '../page.module.css';

interface ConnectionStatus {
  status: 'loading' | 'success' | 'error';
  connected: boolean;
  responseTime?: number;
  error?: string;
}

export default function ConnectionTest() {
  const [directDB, setDirectDB] = useState<ConnectionStatus>({ status: 'loading', connected: false });
  const [backendAPI, setBackendAPI] = useState<ConnectionStatus>({ status: 'loading', connected: false });

  useEffect(() => {
    testConnections();
  }, []);

  const testConnections = async () => {
    // Test 1: Direct DB connection (Vercel API route)
    await testDirectDB();
    
    // Test 2: Backend API connection (Render.com)
    await testBackendAPI();
  };

  const testDirectDB = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/database/status');
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setDirectDB({
          status: 'success',
          connected: data.database?.connected || false,
          responseTime
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setDirectDB({
        status: 'error',
        connected: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const testBackendAPI = async () => {
    const startTime = Date.now();
    try {
      // Get the backend URL from config
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/health`);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setBackendAPI({
          status: 'success',
          connected: data.database?.connected || false,
          responseTime
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setBackendAPI({
        status: 'error',
        connected: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    if (status.status === 'loading') return '⏳';
    if (status.status === 'success' && status.connected) return '✅';
    if (status.status === 'success' && !status.connected) return '⚠️';
    return '❌';
  };

  const getStatusText = (status: ConnectionStatus) => {
    if (status.status === 'loading') return 'Testing...';
    if (status.status === 'success' && status.connected) return 'Connected';
    if (status.status === 'success' && !status.connected) return 'Disconnected';
    return 'Failed';
  };

  return (
    <div className={styles.card}>
      <h2>🔗 Connection Test</h2>
      <p>Testing both connection methods for performance comparison:</p>
      
      <div style={{ marginBottom: '1rem' }}>
        <h3>🏃‍♂️ Direct Database (Vercel → MongoDB)</h3>
        <div className={styles.status}>
          <p>
            <strong>Status:</strong> {getStatusIcon(directDB)} {getStatusText(directDB)}
            {directDB.responseTime && ` (${directDB.responseTime}ms)`}
          </p>
          {directDB.error && (
            <p style={{ color: 'red', fontSize: '0.9rem' }}>
              <strong>Error:</strong> {directDB.error}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>🌐 Backend API (Vercel → Render → MongoDB)</h3>
        <div className={styles.status}>
          <p>
            <strong>Status:</strong> {getStatusIcon(backendAPI)} {getStatusText(backendAPI)}
            {backendAPI.responseTime && ` (${backendAPI.responseTime}ms)`}
          </p>
          {backendAPI.error && (
            <p style={{ color: 'red', fontSize: '0.9rem' }}>
              <strong>Error:</strong> {backendAPI.error}
            </p>
          )}
        </div>
      </div>

      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px',
        fontSize: '0.9rem'
      }}>
        <strong>💡 Performance Tip:</strong> 
        {directDB.responseTime && backendAPI.responseTime && (
          directDB.responseTime < backendAPI.responseTime 
            ? ` Direct DB is ${Math.round(((backendAPI.responseTime - directDB.responseTime) / backendAPI.responseTime) * 100)}% faster!`
            : ` Backend API is ${Math.round(((directDB.responseTime - backendAPI.responseTime) / directDB.responseTime) * 100)}% faster!`
        )}
      </div>

      <button 
        onClick={testConnections}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔄 Test Again
      </button>
    </div>
  );
}
