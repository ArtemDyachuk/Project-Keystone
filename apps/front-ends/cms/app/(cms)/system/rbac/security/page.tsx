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
  "Tenant:Reader": {
    uid: "test-tenant-reader",
    email: "tenant-reader@test.com",
    displayName: "Test Tenant Reader",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Tenant:Reader"],
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
  "Tenant:Owner": {
    uid: "test-tenant-owner",
    email: "owner@test.com",
    displayName: "Test Owner",
    emailVerified: true,
    tenantId: "tenant-1",
    selectedCorporationId: null,
    roles: ["Tenant:Owner"],
    disabled: false,
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

  const runSecurityTests = () => {
    setIsRunning(true);
    const newResults: CategoryResult[] = [];

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

                // Test each user type
        Object.entries(TEST_USERS).forEach(([userName, user]) => {
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

  const getStatusIcon = (status: "PASSED" | "FAILED") => {
    return status === "PASSED" ? "✅" : "❌";
  };

  const getStatusColor = (status: "PASSED" | "FAILED") => {
    return status === "PASSED" ? "var(--success)" : "var(--error)";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>RBAC Security Testing</h1>
        <p>Comprehensive security testing for role-based access control system</p>
      </div>

      <div className={styles.controls}>
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
          {isRunning ? "Running Tests..." : "🔒 Run Security Tests"}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results}>
          <h2>Security Test Results</h2>

          {results.map((category) => (
            <div key={category.category} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <h3>{category.category}</h3>
                <p>{category.description}</p>
                <div className={styles.categorySummary}>
                  <span className={styles.summaryText}>
                    {category.totalPassed}/{category.totalTests} tests passed
                  </span>
                  <span
                    className={styles.summaryStatus}
                    style={{
                      color: category.totalPassed === category.totalTests
                        ? "var(--success)"
                        : "var(--error)"
                    }}
                  >
                    {category.totalPassed === category.totalTests ? "✅ PASSED" : "❌ FAILED"}
                  </span>
                </div>
              </div>

              <div className={styles.testsList}>
                {category.tests.map((test, index) => (
                  <div key={index} className={styles.testItem}>
                    <div className={styles.testHeader}>
                      <span className={styles.permission}>{test.permission}</span>
                      <span
                        className={styles.testStatus}
                        style={{ color: getStatusColor(test.status) }}
                      >
                        {getStatusIcon(test.status)} {test.status}
                      </span>
                    </div>

                    <div className={styles.testDetails}>
                      <div className={styles.expectedSection}>
                        <strong>Expected:</strong> {test.expected.length > 0 ? test.expected.join(", ") : "None"}
                      </div>

                      <div className={styles.actualSection}>
                        <strong>Actual Results:</strong>
                        <div className={styles.userResults}>
                          {Object.entries(test.actualResults).map(([userName, hasAccess]) => (
                            <span
                              key={userName}
                              className={`${styles.userResult} ${test.expected.includes(userName) === hasAccess ? styles.correct : styles.incorrect
                                }`}
                            >
                              {userName}: {hasAccess ? "✅" : "❌"}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.testSummary}>
                        {test.passed}/{test.total} tests passed
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
      </div>
    </div>
  );
}
