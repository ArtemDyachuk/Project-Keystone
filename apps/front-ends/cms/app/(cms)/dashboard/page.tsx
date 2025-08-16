import { getCurrentUser } from "@/app/actions/user.actions";

export default async function DashboardPage() {
  // Get user data from backend API
  const userData = await getCurrentUser();
  
  // Debug environment variables
  const envDebug = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  
  if (!userData) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Dashboard</h1>
        <p>❌ Not authenticated - No session data found</p>
        <p>Please log in to see your session data.</p>
        
        <h2>Environment Debug:</h2>
        <div style={{ 
          background: "#f0f0f0", 
          padding: "15px", 
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "12px"
        }}>
          <pre>{JSON.stringify(envDebug, null, 2)}</pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>
      <p>✅ Authenticated with Firebase session cookie!</p>
      
      <h2>User Data from Session Cookie:</h2>
      <div style={{ 
        background: "#f5f5f5", 
        padding: "20px", 
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "14px"
      }}>
        <pre>{JSON.stringify(userData, null, 2)}</pre>
      </div>
      
      <h2>Environment Debug:</h2>
      <div style={{ 
        background: "#f0f0f0", 
        padding: "15px", 
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px"
      }}>
        <pre>{JSON.stringify(envDebug, null, 2)}</pre>
      </div>
      
      <h2>What This Means:</h2>
      <ul>
        <li>✅ Your Firebase session cookie is working</li>
        <li>✅ You can access user data server-side</li>
        <li>✅ Custom claims (tenant info) are available</li>
        <li>✅ You can build authenticated features</li>
      </ul>
      
      <h2>Session Management:</h2>
      <div style={{ 
        background: "#e8f5e8", 
        border: "1px solid #4caf50",
        borderRadius: "8px",
        padding: "15px",
        marginTop: "15px"
      }}>
        <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>
          🔄 Need to refresh your session?
        </p>
        <p style={{ margin: "0 0 15px 0" }}>
          If you just created a tenant but don't see it in your tenantIds, click the button below to check what your current permissions should be.
        </p>
        <form action="/api/auth/refresh-session" method="POST">
          <button 
            type="submit"
            style={{
              background: "#4caf50",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            🔄 Check Fresh Claims
          </button>
        </form>
        <p style={{ margin: "10px 0 0 0", fontSize: "12px", opacity: "0.8" }}>
          Note: If you see old tenant data, you may need to sign out and sign in again to get a fresh session.
        </p>
      </div>
    </div>
  );
}
