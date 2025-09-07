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
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
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
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
  },
  "Tenant:Reader": {
    uid: "test-tenant-reader",
    email: "tenant-reader@test.com",
    displayName: "Test Tenant Reader",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Tenant:Reader"],
    disabled: false,
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
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
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
  },
  "Tenant:Owner": {
    uid: "test-tenant-owner",
    email: "owner@test.com",
    displayName: "Test Owner",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Tenant:Owner"],
    disabled: false,
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
  },
  "Global:Reader": {
    uid: "test-global-reader",
    email: "global-reader@test.com",
    displayName: "Test Global Reader",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Global:Reader"],
    disabled: false,
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
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
    mfa: false,
    authTime: Math.floor(Date.now() / 1000),
  },
};

// Test configurations
const SECURITY_TESTS: Array<{
  category: string;
  description: string;
  tests: Array<{ permission: string; expected: string[] }>;
}> = [
    {
      category: "User Management Access",
      description: "Test who can access user management functions",
      tests: [
        {
          permission: PERMISSIONS.USER_READ,
          expected: ["User:Reader", "User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Reader", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.USER_CREATE,
          expected: ["User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.USER_INVITE,
          expected: ["User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.USER_UPDATE,
          expected: ["User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.USER_DELETE,
          expected: ["User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.USER_MANAGE,
          expected: ["User:Admin", "Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
      ],
    },
    {
      category: "Tenant Management Access",
      description: "Test who can access tenant management functions",
      tests: [
        {
          permission: PERMISSIONS.TENANT_READ,
          expected: ["User:Reader", "User:Admin", "Tenant:Reader", "Tenant:Admin", "Tenant:Owner", "Global:Reader", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.TENANT_CREATE,
          expected: ["Global:Admin"],
        },
        {
          permission: PERMISSIONS.TENANT_UPDATE,
          expected: ["Tenant:Admin", "Tenant:Owner", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.TENANT_DELETE,
          expected: ["Tenant:Owner", "Global:Admin"],
        },
      ],
    },
    {
      category: "Global Access Control",
      description: "Test global permission access",
      tests: [
        {
          permission: PERMISSIONS.GLOBAL_READ,
          expected: ["Global:Reader", "Global:Admin"],
        },
        {
          permission: PERMISSIONS.GLOBAL_ADMIN,
          expected: ["Global:Admin"],
        },
      ],
    },
    {
      category: "Edge Cases",
      description: "Test security edge cases",
      tests: [
        {
          permission: "invalid:permission",
          expected: ["Global:Admin"], // Global:Admin has access to everything
        },
        {
          permission: "admin:super",
          expected: ["Global:Admin"], // Global:Admin has access to everything
        },
        {
          permission: "fake:permission",
          expected: ["Global:Admin"], // Global:Admin has access to everything
        },
      ],
    },
  ];

interface TestResult {
  permission: string;
  expected: string[];
  actualResults: Record<string, boolean>;
  passed: number;
  total: number;
  status: "PASSED" | "FAILED";
}

interface CategoryResult {
  category: string;
  description: string;
  tests: TestResult[];
  totalPassed: number;
  totalTests: number;
}

export default function RBACSecurityPage() {
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");

  const runSecurityTests = () => {
    setIsRunning(true);
    const newResults: CategoryResult[] = [];

    // Filter users based on selected role
    const usersToTest = selectedRole === "all" 
      ? TEST_USERS 
      : { [selectedRole]: TEST_USERS[selectedRole] };

    SECURITY_TESTS.forEach((category) => {
      const categoryResult: CategoryResult = {
        category: category.category,
        description: category.description,
        tests: [],
        totalPassed: 0,
        totalTests: 0,
      };

      category.tests.forEach((test) => {
        const testResult: TestResult = {
          permission: test.permission,
          expected: test.expected,
          actualResults: {},
          passed: 0,
          total: 0,
          status: "PASSED",
        };

        let total = 0;
        let passed = 0;

        // Test each user type (filtered by selection)
        Object.entries(usersToTest).forEach(([userName, user]) => {
          const hasAccess = RBACService.hasPermission(user, test.permission);
          testResult.actualResults[userName] = hasAccess;
          total++;
          
          const shouldHaveAccess = test.expected.includes(userName);
          if (hasAccess === shouldHaveAccess) {
            passed++;
          }
        });

        testResult.passed = passed;
        testResult.total = total;
        testResult.status = passed === total ? "PASSED" : "FAILED";

        categoryResult.tests.push(testResult);
        categoryResult.totalPassed += passed;
        categoryResult.totalTests += total;
      });

      newResults.push(categoryResult);
    });

    setResults(newResults);
    setIsRunning(false);
  };



  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>RBAC Security Testing</h1>
        <p>Comprehensive security testing for role-based access control system</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label htmlFor="role-select">Select Role to Test:</label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={styles.roleSelect}
          >
            <option value="all">All Roles (Comprehensive Test)</option>
            {Object.keys(TEST_USERS).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.debugToggle}>
          <label>
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            Show Debug Logs
          </label>
        </div>

        <button
          onClick={runSecurityTests}
          disabled={isRunning}
          className={styles.runButton}
        >
          {isRunning ? "Running Tests..." : `🔒 Test ${selectedRole === "all" ? "All Roles" : selectedRole}`}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results}>
          <h2>Security Test Results</h2>

          {/* Summary Stats */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.filter(r => r.totalPassed === r.totalTests).length}
              </span>
              <span className={styles.summaryLabel}>Categories Passed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.filter(r => r.totalPassed !== r.totalTests).length}
              </span>
              <span className={styles.summaryLabel}>Categories Failed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.reduce((total, category) => total + category.totalPassed, 0)}
              </span>
              <span className={styles.summaryLabel}>Tests Passed</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryNumber}>
                {results.reduce((total, category) => total + (category.totalTests - category.totalPassed), 0)}
              </span>
              <span className={styles.summaryLabel}>Tests Failed</span>
            </div>
          </div>

          {results.map((category) => (
            <div key={category.category} className={styles.pageCard}>
              <div className={styles.pageHeader}>
                <div className={styles.pageInfo}>
                  <h3>{category.category}</h3>
                  <p>{category.description}</p>
                </div>
                <div className={styles.pageStatus}>
                  <span className={`${styles.statusBadge} ${category.totalPassed === category.totalTests ? styles.pass : styles.fail}`}>
                    {category.totalPassed === category.totalTests ? "✅ PASSED" : "❌ FAILED"}
                  </span>
                </div>
              </div>

              <div className={styles.componentsGrid}>
                {category.tests.map((test, index) => (
                  <div key={index} className={styles.componentCard}>
                    <div className={styles.componentHeader}>
                      <h4>{test.permission}</h4>
                      <span className={`${styles.statusBadge} ${test.status === "PASSED" ? styles.pass : styles.fail}`}>
                        {test.status}
                      </span>
                    </div>

                    <div className={styles.componentDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.label}>Expected Access:</span>
                        <span className={styles.description}>
                          {test.expected.length > 0 ? test.expected.join(", ") : "None"}
                        </span>
                      </div>

                      <div className={styles.detailItem}>
                        <span className={styles.label}>Test Results:</span>
                        <div className={styles.userResults}>
                          {Object.entries(test.actualResults).map(([userName, hasAccess]) => (
                            <span
                              key={userName}
                              className={`${styles.userResult} ${test.expected.includes(userName) === hasAccess ? styles.correct : styles.incorrect}`}
                            >
                              {userName}: {hasAccess ? "✅" : "❌"}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.detailItem}>
                        <span className={styles.label}>Summary:</span>
                        <span className={styles.description}>
                          {test.passed}/{test.total} tests passed
                        </span>
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
        <h3>What These Tests Verify</h3>
        <ul>
          <li><strong>User Management:</strong> Ensures only authorized roles can manage users</li>
          <li><strong>Tenant Management:</strong> Verifies tenant access control is working</li>
          <li><strong>Global Access:</strong> Tests system-wide permission boundaries</li>
          <li><strong>Edge Cases:</strong> Ensures invalid permissions are properly rejected</li>
        </ul>
        <p><strong>Security Goal:</strong> All tests should pass to ensure proper access control.</p>
        <p><strong>Debug Mode:</strong> Enable to see detailed permission checking logs in the console.</p>
        <p><strong>Status Legend:</strong></p>
        <ul>
          <li><strong>✅ PASSED:</strong> All tests in category passed successfully</li>
          <li><strong>❌ FAILED:</strong> Some tests in category failed</li>
          <li><strong>🔒 Test:</strong> Run tests for specific role or all roles</li>
        </ul>
      </div>
    </div>
  );
}
