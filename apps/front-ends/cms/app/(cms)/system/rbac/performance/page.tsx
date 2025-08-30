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

interface PerformanceResult {
  userType: string;
  singlePermission: number;
  multiplePermissions: number;
  roleCheck: number;
  permissionsList: number;
  checksPerSecond: {
    singlePermission: number;
    multiplePermissions: number;
    roleCheck: number;
    permissionsList: number;
  };
}

export default function RBACPerformancePage() {
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(10000);

  const measurePerformance = (fn: () => void, iterations: number): number => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const end = performance.now();
    return end - start;
  };

  const runPerformanceTests = () => {
    setIsRunning(true);
    const newResults: PerformanceResult[] = [];

    Object.entries(TEST_USERS).forEach(([userType, user]) => {
      // Test single permission check
      const singlePermissionTime = measurePerformance(
        () => RBACService.hasPermission(user, PERMISSIONS.USER_READ),
        iterations
      );

      // Test multiple permissions check
      const multiplePermissionsTime = measurePerformance(
        () => RBACService.hasAnyPermission(user, [PERMISSIONS.USER_READ, PERMISSIONS.USER_CREATE]),
        iterations
      );

      // Test role check
      const roleCheckTime = measurePerformance(
        () => RBACService.hasRole(user, "User:Admin"),
        iterations
      );

      // Test getting all permissions
      const permissionsListTime = measurePerformance(
        () => RBACService.getUserPermissions(user),
        iterations
      );

      const result: PerformanceResult = {
        userType,
        singlePermission: singlePermissionTime,
        multiplePermissions: multiplePermissionsTime,
        roleCheck: roleCheckTime,
        permissionsList: permissionsListTime,
        checksPerSecond: {
          singlePermission: Math.round(iterations / (singlePermissionTime / 1000)),
          multiplePermissions: Math.round(iterations / (multiplePermissionsTime / 1000)),
          roleCheck: Math.round(iterations / (roleCheckTime / 1000)),
          permissionsList: Math.round(iterations / (permissionsListTime / 1000)),
        },
      };

      newResults.push(result);
    });

    setResults(newResults);
    setIsRunning(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>RBAC Performance Testing</h1>
        <p>Test the performance of role-based access control operations</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label htmlFor="iterations">Test Iterations:</label>
          <input
            id="iterations"
            type="number"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value) || 1000)}
            min="1000"
            max="100000"
            step="1000"
          />
        </div>

        <button
          onClick={runPerformanceTests}
          disabled={isRunning}
          className={styles.runButton}
        >
          {isRunning ? "Running Tests..." : "🚀 Run Performance Tests"}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results}>
          <h2>Performance Results</h2>
          <div className={styles.resultsGrid}>
            {results.map((result) => (
              <div key={result.userType} className={styles.resultCard}>
                <h3>{result.userType}</h3>
                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.label}>Single Permission:</span>
                    <span className={styles.value}>
                      {result.singlePermission.toFixed(2)}ms
                    </span>
                    <span className={styles.rate}>
                      {result.checksPerSecond.singlePermission.toLocaleString()}/s
                    </span>
                  </div>

                  <div className={styles.metric}>
                    <span className={styles.label}>Multiple Permissions:</span>
                    <span className={styles.value}>
                      {result.multiplePermissions.toFixed(2)}ms
                    </span>
                    <span className={styles.rate}>
                      {result.checksPerSecond.multiplePermissions.toLocaleString()}/s
                    </span>
                  </div>

                  <div className={styles.metric}>
                    <span className={styles.label}>Role Check:</span>
                    <span className={styles.value}>
                      {result.roleCheck.toFixed(2)}ms
                    </span>
                    <span className={styles.rate}>
                      {result.checksPerSecond.roleCheck.toLocaleString()}/s
                    </span>
                  </div>

                  <div className={styles.metric}>
                    <span className={styles.label}>Permissions List:</span>
                    <span className={styles.value}>
                      {result.permissionsList.toFixed(2)}ms
                    </span>
                    <span className={styles.rate}>
                      {result.checksPerSecond.permissionsList.toLocaleString()}/s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.info}>
        <h3>What These Tests Measure</h3>
        <ul>
          <li><strong>Single Permission:</strong> Time to check if a user has one specific permission</li>
          <li><strong>Multiple Permissions:</strong> Time to check if a user has any of multiple permissions</li>
          <li><strong>Role Check:</strong> Time to check if a user has a specific role</li>
          <li><strong>Permissions List:</strong> Time to get all permissions for a user</li>
        </ul>
        <p><strong>Target:</strong> All operations should complete in under 1ms for {iterations.toLocaleString()} iterations.</p>
      </div>
    </div>
  );
}
