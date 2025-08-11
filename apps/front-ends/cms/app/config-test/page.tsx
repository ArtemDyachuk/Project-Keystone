import { config, getApiUrl, getHealthCheckUrl, getDatabaseStatusUrl } from "../../lib/config";

export default function ConfigTestPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>🔧 Configuration Test Page</h1>
      
      <div style={{ marginBottom: "2rem" }}>
        <h2>Current Configuration</h2>
        <pre style={{ 
          backgroundColor: "#f5f5f5", 
          padding: "1rem", 
          borderRadius: "8px",
          overflow: "auto"
        }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Generated API URLs</h2>
        <div style={{ 
          backgroundColor: "#f0f8ff", 
          padding: "1rem", 
          borderRadius: "8px" 
        }}>
          <p><strong>Health Check:</strong> {getHealthCheckUrl()}</p>
          <p><strong>Database Status:</strong> {getDatabaseStatusUrl()}</p>
          <p><strong>Custom Endpoint:</strong> {getApiUrl("/api/tenants")}</p>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Environment Variables</h2>
        <div style={{ 
          backgroundColor: "#fff3cd", 
          padding: "1rem", 
          borderRadius: "8px" 
        }}>
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
          <p><strong>RAILWAY_STATIC_URL:</strong> {process.env.RAILWAY_STATIC_URL || "Not set"}</p>
          <p><strong>RAILWAY_SERVICE_URL:</strong> {process.env.RAILWAY_SERVICE_URL || "Not set"}</p>
          <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "Not set"}</p>
          <p><strong>MONGODB_URI:</strong> {process.env.MONGODB_URI ? "✅ Set" : "❌ Not set"}</p>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h2>Connection Types Explained</h2>
        <div style={{ 
          backgroundColor: "#d1ecf1", 
          padding: "1rem", 
          borderRadius: "8px" 
        }}>
          <h3>1. Direct Database Connection</h3>
          <p>Uses <code>@keystone/database</code> package directly</p>
          <p>Purpose: Simple operations, health checks</p>
          <p>Environment: <code>MONGODB_URI</code></p>
          
          <h3>2. Backend API Connection</h3>
          <p>HTTP calls to NestJS backend service</p>
          <p>Purpose: Business logic, CRUD operations</p>
          <p>Environment: Auto-detected from Railway</p>
        </div>
      </div>

      <div>
        <h2>Railway Deployment Status</h2>
        <div style={{ 
          backgroundColor: config.isProduction ? "#d4edda" : "#f8d7da", 
          padding: "1rem", 
          borderRadius: "8px" 
        }}>
          <p><strong>Environment:</strong> {config.isProduction ? "Production" : "Development"}</p>
          <p><strong>API Base URL:</strong> {config.apiBaseUrl}</p>
          <p><strong>Railway Detected:</strong> {config.railwayEnvironment.staticUrl ? "✅ Yes" : "❌ No"}</p>
        </div>
      </div>
    </div>
  );
}
