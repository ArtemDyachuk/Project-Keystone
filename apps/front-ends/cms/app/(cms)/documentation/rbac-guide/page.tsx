"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function RBACGuidePage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/documentation" className={styles.backLink}>
          ← Back to Documentation
        </Link>
        <h1>🔐 RBAC System Guide</h1>
        <p>Complete guide to Role-Based Access Control system</p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Overview</h2>
          <p>
            This project implements <strong>Role-Based Access Control (RBAC)</strong> with a centralized permission system.
            The system provides both <strong>backend security</strong> (API guards) and <strong>frontend UX</strong> (component visibility control).
          </p>
        </section>

        <section className={styles.section}>
          <h2>🏗️ Architecture</h2>
          <div className={styles.codeBlock}>
            <pre><code>{`@keystone/rbac (Package)
├── roles.config.ts     # Single source of truth for roles & permissions
├── helpers.ts          # Permission checking logic
└── types.ts           # TypeScript definitions

Frontend CMS
├── services/rbac.service.ts    # Frontend RBAC service
├── components/rbac/guards/     # React permission guards
└── system/rbac/               # Testing & monitoring tools`}</code></pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>🔑 Core Concepts</h2>

          <h3>Permissions</h3>
          <ul>
            <li><strong>Granular actions</strong>: <code>user:read</code>, <code>user:create</code>, <code>tenant:update</code></li>
            <li><strong>Global actions</strong>: <code>global:read</code>, <code>global:admin</code></li>
            <li><strong>Resource-based</strong>: Each resource has CRUD permissions</li>
          </ul>

          <h3>Roles</h3>
          <ul>
            <li><strong>User Roles</strong>: <code>User:Reader</code>, <code>User:Admin</code></li>
            <li><strong>Tenant Roles</strong>: <code>Tenant:Reader</code>, <code>Tenant:Admin</code>, <code>Tenant:Owner</code></li>
            <li><strong>Global Roles</strong>: <code>Global:Reader</code>, <code>Global:Admin</code></li>
          </ul>

          <h3>Role Hierarchy</h3>
          <ul>
            <li><code>Global:Admin</code> = <strong>God role</strong> (access to everything)</li>
            <li><code>Tenant:Owner</code> &gt; <code>Tenant:Admin</code> &gt; <code>Tenant:Reader</code></li>
            <li><code>User:Admin</code> &gt; <code>User:Reader</code></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>🛠️ How to Use</h2>

          <h3>1. Protect Components</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`import { PermissionGuard } from "@/app/components/rbac/guards/PermissionGuard";
import { PERMISSIONS } from "@keystone/rbac";

// Hide/show based on permission
<PermissionGuard permission={PERMISSIONS.USER_CREATE}>
  <button>Create User</button>
</PermissionGuard>

// Multiple permissions (any)
<MultiplePermissionsGuard permissions={[PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE]}>
  <UserManagementPanel />
</MultiplePermissionsGuard>

// Multiple permissions (all required)
<MultiplePermissionsGuard permissions={[PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE]} requireAll>
  <AdvancedUserPanel />
</MultiplePermissionsGuard>`}</code></pre>
          </div>

          <h3>2. Check Permissions in Code</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`import { RBACService } from '@/app/services/rbac.service';

// Check single permission
if (RBACService.hasPermission(user, PERMISSIONS.USER_CREATE)) {
  // User can create users
}

// Check multiple permissions
if (
  RBACService.hasAnyPermission(user, [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
  ])
) {
  // User has at least one permission
}

// Check role
if (RBACService.hasRole(user, 'User:Admin')) {
  // User has User:Admin role
}`}</code></pre>
          </div>

          <h3>3. Lock Down Pages</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// In page.tsx - hide sections based on permissions
<PermissionGuard permission={PERMISSIONS.USER_UPDATE}>
  <EditUserSection />
</PermissionGuard>

<PermissionGuard permission={PERMISSIONS.USER_DELETE}>
  <DeleteUserSection />
</PermissionGuard>`}</code></pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>🔧 How to Manage</h2>

          <h3>Adding New Permissions</h3>
          <ol>
            <li><strong>Define in <code>@keystone/rbac/src/roles.config.ts</code></strong>:
              <div className={styles.codeBlock}>
                <pre><code>{`export const PERMISSIONS = {
  // ... existing permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
} as const;`}</code></pre>
              </div>
            </li>
            <li><strong>Assign to roles</strong>:
              <div className={styles.codeBlock}>
                <pre><code>{`Reader: {
  name: "User:Reader",
  permissions: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.ANALYTICS_READ, // New permission
  ],
},`}</code></pre>
              </div>
            </li>
            <li><strong>Rebuild package</strong>: <code>npm run build</code> in <code>packages/rbac/</code></li>
          </ol>

          <h3>Adding New Roles</h3>
          <ol>
            <li><strong>Define in <code>roles.config.ts</code></strong>:
              <div className={styles.codeBlock}>
                <pre><code>{`Moderator: {
  name: "User:Moderator",
  displayName: "User Moderator",
  description: "Can read users and moderate content",
  permissions: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.CONTENT_MODERATE,
  ],
  inheritsFrom: ["User:Reader"], // Optional inheritance
},`}</code></pre>
              </div>
            </li>
            <li><strong>Rebuild package</strong></li>
          </ol>

          <h3>Adding New Pages/Components</h3>
          <ol>
            <li><strong>Add to test suite</strong> in <code>system/rbac/component-test/page.tsx</code>:
              <div className={styles.codeBlock}>
                <pre><code>{`"/analytics": {
  title: "Analytics Dashboard",
  description: "View analytics and reports",
  components: [
    { name: "AnalyticsChart", permission: PERMISSIONS.ANALYTICS_READ, description: "Analytics charts" },
    { name: "ExportButton", permission: PERMISSIONS.ANALYTICS_EXPORT, description: "Export data" },
  ],
},`}</code></pre>
              </div>
            </li>
            <li><strong>Protect components</strong> using <code>PermissionGuard</code></li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>🧪 Testing & Monitoring</h2>

          <h3>Component Access Testing</h3>
          <p><strong>Location</strong>: <Link href="/system/rbac/component-test">/system/rbac/component-test</Link></p>
          <p><strong>What it does</strong>:</p>
          <ul>
            <li>Tests if each role can access specific UI components</li>
            <li>Validates RBAC is working at component level</li>
            <li>Shows how different roles see different parts of UI</li>
          </ul>
          <p><strong>How to use</strong>:</p>
          <ol>
            <li>Select a user role from dropdown</li>
            <li>Click "Run Component Access Test"</li>
            <li>Review results for each page/component</li>
            <li>Fix any FAILED tests</li>
          </ol>
          <p><strong>Adding new tests</strong>:</p>
          <ul>
            <li>Just add new routes to <code>PAGE_STRUCTURE</code></li>
            <li>Expectations are automatic (based on your RBAC rules)</li>
          </ul>

          <h3>Performance Testing</h3>
          <p><strong>Location</strong>: <Link href="/system/rbac/performance">/system/rbac/performance</Link></p>
          <p><strong>What it measures</strong>:</p>
          <ul>
            <li>Single permission check speed</li>
            <li>Multiple permissions check speed</li>
            <li>Role check speed</li>
            <li>Permissions list generation speed</li>
          </ul>
          <p><strong>Target</strong>: All operations under 1ms for 10,000 iterations</p>

          <h3>Security Testing</h3>
          <p><strong>Location</strong>: <Link href="/system/rbac/security">/system/rbac/security</Link></p>
          <p><strong>What it validates</strong>:</p>
          <ul>
            <li>Permission access for each role</li>
            <li>Edge cases and invalid permissions</li>
            <li>Global admin bypass logic</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>📋 Best Practices</h2>

          <h3>1. Permission Naming</h3>
          <ul>
            <li>Use <code>resource:action</code> format: <code>user:read</code>, <code>tenant:update</code></li>
            <li>Be specific: <code>user:invite</code> not just <code>user:create</code></li>
          </ul>

          <h3>2. Role Design</h3>
          <ul>
            <li><strong>Principle of least privilege</strong>: Start with minimal permissions</li>
            <li><strong>Inheritance</strong>: Use <code>inheritsFrom</code> for role hierarchies</li>
            <li><strong>Naming</strong>: <code>Resource:Level</code> format (e.g., <code>User:Admin</code>)</li>
          </ul>

          <h3>3. Component Protection</h3>
          <ul>
            <li><strong>Always protect</strong> sensitive actions (create, update, delete)</li>
            <li><strong>Use guards</strong> for conditional rendering</li>
            <li><strong>Test thoroughly</strong> with different roles</li>
          </ul>

          <h3>4. Testing Strategy</h3>
          <ul>
            <li><strong>Run tests</strong> after any RBAC changes</li>
            <li><strong>Test edge cases</strong> (invalid permissions, global admin)</li>
            <li><strong>Monitor performance</strong> for degradation</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>🚨 Common Issues</h2>

          <h3>Permission Not Working</h3>
          <ol>
            <li>Check if permission exists in <code>PERMISSIONS</code></li>
            <li>Verify role has permission in <code>roles.config.ts</code></li>
            <li>Rebuild <code>@keystone/rbac</code> package</li>
            <li>Check component is properly wrapped with guard</li>
          </ol>

          <h3>Test Failures</h3>
          <ol>
            <li><strong>Expected vs Actual mismatch</strong>: Check if permission logic is correct</li>
            <li><strong>Global Admin issues</strong>: Ensure <code>Global:Admin</code> bypass is working</li>
            <li><strong>Role inheritance</strong>: Verify <code>inheritsFrom</code> relationships</li>
          </ol>

          <h3>Performance Issues</h3>
          <ol>
            <li>Check if <code>Global:Admin</code> bypass is working</li>
            <li>Verify permission lookup isn't doing unnecessary iterations</li>
            <li>Monitor for permission bloat</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>🔄 Maintenance Workflow</h2>

          <h3>When Adding New Features</h3>
          <ol>
            <li><strong>Define permissions</strong> in <code>roles.config.ts</code></li>
            <li><strong>Assign to appropriate roles</strong></li>
            <li><strong>Protect components</strong> with guards</li>
            <li><strong>Add to test suite</strong></li>
            <li><strong>Test with different roles</strong></li>
            <li><strong>Rebuild package</strong></li>
          </ol>

          <h3>When Modifying Roles</h3>
          <ol>
            <li><strong>Update <code>roles.config.ts</code></strong></li>
            <li><strong>Rebuild package</strong></li>
            <li><strong>Run all tests</strong> to verify changes</li>
            <li><strong>Check performance</strong> hasn't degraded</li>
          </ol>

          <h3>Regular Maintenance</h3>
          <ol>
            <li><strong>Weekly</strong>: Run performance tests</li>
            <li><strong>After changes</strong>: Run component access tests</li>
            <li><strong>Monthly</strong>: Review permission usage and clean up unused ones</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>📚 Quick Reference</h2>

          <h3>File Locations</h3>
          <ul>
            <li><strong>Roles & Permissions</strong>: <code>packages/rbac/src/roles.config.ts</code></li>
            <li><strong>Frontend Service</strong>: <code>app/services/rbac.service.ts</code></li>
            <li><strong>React Guards</strong>: <code>app/components/rbac/guards/</code></li>
            <li><strong>Testing Tools</strong>: <code>app/(cms)/system/rbac/</code></li>
          </ul>

          <h3>Key Commands</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`# Rebuild RBAC package
cd packages/rbac && npm run build

# Run tests
cd apps/front-ends/cms && npm run test

# Check performance
# Visit /system/rbac/performance`}</code></pre>
          </div>

          <h3>Common Patterns</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// Hide/show entire sections
<PermissionGuard permission={PERMISSIONS.USER_ADMIN}>
  <AdminPanel />
</PermissionGuard>

// Conditional button states
<button disabled={!RBACService.hasPermission(user, PERMISSIONS.USER_CREATE)}>
  Create User
</button>

// Role-based navigation
{user.roles.some(role => role.includes("User:")) && (
  <NavLink to="/users">Users</NavLink>
)}`}</code></pre>
          </div>
        </section>

        <div className={styles.footer}>
          <p>
            <strong>Need Help?</strong> Check the test results first, then review this documentation.
            The system is designed to be self-documenting through its test suite.
          </p>
          <div className={styles.links}>
            <Link href="/documentation" className={styles.footerLink}>
              ← Back to Documentation
            </Link>
            <Link href="/documentation/rbac-cheatsheet" className={styles.footerLink}>
              View Cheat Sheet →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
