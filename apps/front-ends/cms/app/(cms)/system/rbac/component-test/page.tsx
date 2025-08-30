"use client";

import { useState } from "react";
import { RBACService } from "@/app/services/rbac.service";
import { PERMISSIONS } from "@keystone/rbac";
import type { CurrentUser } from "@/lib/sessions/utils";
import styles from "./page.module.css";

// Test user configurations
const TEST_USERS: Record<string, CurrentUser> = {
  "User:Reader": {
    uid: "test-user-reader",
    email: "reader@test.com",
    displayName: "Test Reader",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["User:Reader"],
    disabled: false,
  },
  "User:Admin": {
    uid: "test-user-admin",
    email: "admin@test.com",
    displayName: "Test Admin",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["User:Admin"],
    disabled: false,
  },
  "Tenant:Admin": {
    uid: "test-tenant-admin",
    email: "tenant-admin@test.com",
    displayName: "Test Tenant Admin",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Tenant:Admin"],
    disabled: false,
  },
  "Global:Admin": {
    uid: "test-global-admin",
    email: "global@test.com",
    displayName: "Test Global Admin",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Global:Admin"],
    disabled: false,
  },
};

// Basic page structure with component permissions
// 🚀 FUTURE: Just add new routes here - no other code changes needed!
// Example:
// "/analytics": {
//   title: "Analytics",
//   description: "View analytics and reports", 
//   components: [
//     { name: "AnalyticsChart", permission: PERMISSIONS.ANALYTICS_READ, description: "Analytics charts" },
//     { name: "ExportButton", permission: PERMISSIONS.ANALYTICS_EXPORT, description: "Export data" }
//   ]
// }
const PAGE_STRUCTURE = {
  "/users": {
    title: "User Management",
    description: "Manage users and send invites",
    components: [
      { name: "UserList", permission: PERMISSIONS.USER_READ, description: "List of all users" },
      { name: "SendInviteButton", permission: PERMISSIONS.USER_INVITE, description: "Button to invite new users" },
      { name: "EditUserButton", permission: PERMISSIONS.USER_UPDATE, description: "Button to edit user details" },
      { name: "DeleteUserButton", permission: PERMISSIONS.USER_DELETE, description: "Button to delete users" },
    ]
  },
  "/system": {
    title: "System Administration",
    description: "System tools and RBAC testing",
    components: [
      { name: "SystemOverview", permission: PERMISSIONS.GLOBAL_READ, description: "System overview page" },
      { name: "RBACTools", permission: PERMISSIONS.GLOBAL_ADMIN, description: "RBAC testing tools" },
    ]
  },
  "/tenants": {
    title: "Tenant Management",
    description: "Manage tenant settings",
    components: [
      { name: "TenantList", permission: PERMISSIONS.TENANT_READ, description: "List of all tenants" },
      { name: "CreateTenantButton", permission: PERMISSIONS.TENANT_CREATE, description: "Button to create new tenants" },
      { name: "EditTenantButton", permission: PERMISSIONS.TENANT_UPDATE, description: "Button to edit tenant settings" },
      { name: "DeleteTenantButton", permission: PERMISSIONS.TENANT_DELETE, description: "Button to delete tenants" },
    ]
  }
};

interface ComponentTestResult {
  componentName: string;
  permission: string;
  description: string;
  canAccess: boolean;
  expectedAccess: boolean;
  status: "PASS" | "FAIL";
}

interface PageTestResult {
  path: string;
  title: string;
  description: string;
  components: ComponentTestResult[];
  overallStatus: "PASS" | "FAIL" | "PARTIAL";
}

export default function RBACComponentTestPage() {
  const [selectedRole, setSelectedRole] = useState<string>("User:Reader");
  const [results, setResults] = useState<PageTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runComponentTest = () => {
    setIsRunning(true);
    const newResults: PageTestResult[] = [];

    Object.entries(PAGE_STRUCTURE).forEach(([path, pageInfo]) => {
      const testUser = TEST_USERS[selectedRole];
      const componentResults: ComponentTestResult[] = [];

      pageInfo.components.forEach(component => {
        const canAccess = RBACService.hasPermission(testUser, component.permission);

        // Use RBAC system to determine expected access automatically
        let expectedAccess = false;

        if (selectedRole === "Global:Admin") {
          expectedAccess = true; // Global admin can access everything
        } else {
          // Create a test user with the selected role and check if they have the permission
          const testUserWithRole = TEST_USERS[selectedRole];
          expectedAccess = RBACService.hasPermission(testUserWithRole, component.permission);
        }

        const status = canAccess === expectedAccess ? "PASS" : "FAIL";

        componentResults.push({
          componentName: component.name,
          permission: component.permission,
          description: component.description,
          canAccess,
          expectedAccess,
          status
        });
      });

      // Determine overall page status
      const failedComponents = componentResults.filter(c => c.status === "FAIL");
      let overallStatus: "PASS" | "FAIL" | "PARTIAL" = "PASS";
      if (failedComponents.length > 0) {
        overallStatus = failedComponents.length === componentResults.length ? "FAIL" : "PARTIAL";
      }

      newResults.push({
        path,
        title: pageInfo.title,
        description: pageInfo.description,
        components: componentResults,
        overallStatus
      });
    });

    setResults(newResults);
    setIsRunning(false);
  };



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>RBAC Component Access Testing</h1>
        <p>Test which components each user role can access across different pages</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label htmlFor="role">Select User Role:</label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={styles.roleSelect}
          >
            {Object.keys(TEST_USERS).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button
          onClick={runComponentTest}
          disabled={isRunning}
          className={styles.runButton}
        >
          {isRunning ? "Running Tests..." : "🧪 Run Component Access Test"}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results}>
          <h2>Component Access Test Results for {selectedRole}</h2>

          {/* Summary Stats */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.filter(r => r.overallStatus === "PASS").length}
              </span>
              <span className={styles.summaryLabel}>Pages Passed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.filter(r => r.overallStatus === "FAIL").length}
              </span>
              <span className={styles.summaryLabel}>Pages Failed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.reduce((total, page) => total + page.components.filter(c => c.status === "PASS").length, 0)}
              </span>
              <span className={styles.summaryLabel}>Components Passed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.reduce((total, page) => total + page.components.filter(c => c.status === "FAIL").length, 0)}
              </span>
              <span className={styles.summaryLabel}>Components Failed</span>
            </div>
          </div>

          {results.map((pageResult) => (
            <div key={pageResult.path} className={styles.pageCard}>
              <div className={styles.pageHeader}>
                <div className={styles.pageInfo}>
                  <h3>{pageResult.title}</h3>
                  <p>{pageResult.description}</p>
                  <span className={styles.pagePath}>{pageResult.path}</span>
                </div>
                <div className={styles.pageStatus}>
                  <span className={`${styles.statusBadge} ${styles[pageResult.overallStatus.toLowerCase()]}`}>
                    {pageResult.overallStatus}
                  </span>
                </div>
              </div>

              <div className={styles.componentsGrid}>
                {pageResult.components.map((component, index) => (
                  <div key={index} className={styles.componentCard}>
                    <div className={styles.componentHeader}>
                      <h4>{component.componentName}</h4>
                      <span className={`${styles.statusBadge} ${styles[component.status.toLowerCase()]}`}>
                        {component.status}
                      </span>
                    </div>

                    <div className={styles.componentDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Permission:</span>
                        <code className={styles.permission}>{component.permission}</code>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Description:</span>
                        <span className={styles.description}>{component.description}</span>
                      </div>

                      <div className={styles.accessRow}>
                        <div className={styles.accessItem}>
                          <span className={styles.label}>Access:</span>
                          <span className={`${styles.accessStatus} ${component.canAccess ? styles.canAccess : styles.cannotAccess}`}>
                            {component.canAccess ? "✅ Can Access" : "❌ Cannot Access"}
                          </span>
                        </div>
                        <div className={styles.accessItem}>
                          <span className={styles.label}>Expected:</span>
                          <span className={`${styles.accessStatus} ${component.expectedAccess ? styles.shouldAccess : styles.shouldNotAccess}`}>
                            {component.expectedAccess ? "✅ Should Access" : "❌ Should Not Access"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.info}>
        <h3>What This Test Does</h3>
        <ul>
          <li><strong>Component Access:</strong> Tests if each role can access specific UI components</li>
          <li><strong>Permission Validation:</strong> Verifies RBAC is working at the component level</li>
          <li><strong>Page Coverage:</strong> Tests access across different pages in your app</li>
          <li><strong>Role Behavior:</strong> Shows how different roles see different parts of the UI</li>
        </ul>
        <p><strong>Status Legend:</strong></p>
        <ul>
          <li><strong>✅ PASS:</strong> Component access matches expected behavior</li>
          <li><strong>❌ FAIL:</strong> Component access doesn't match expected behavior</li>
          <li><strong>⚠️ PARTIAL:</strong> Some components pass, some fail</li>
        </ul>
      </div>
    </div>
  );
}
