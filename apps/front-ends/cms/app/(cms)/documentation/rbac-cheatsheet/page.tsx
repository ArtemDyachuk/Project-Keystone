"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function RBACCheatSheetPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/documentation" className={styles.backLink}>
          ← Back to Documentation
        </Link>
        <h1>⚡ RBAC Developer Cheat Sheet</h1>
        <p>Quick reference for common RBAC operations</p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>🚀 Quick Start</h2>

          <h3>1. Protect a Component</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`import { PermissionGuard } from "@/app/components/rbac/guards/PermissionGuard";
import { PERMISSIONS } from "@keystone/rbac";

<PermissionGuard permission={PERMISSIONS.USER_CREATE}>
  <button>Create User</button>
</PermissionGuard>`}</code></pre>
          </div>

          <h3>2. Check Permission in Code</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`import { RBACService } from "@/app/services/rbac.service";

if (RBACService.hasPermission(user, PERMISSIONS.USER_UPDATE)) {
  // User can update users
}`}</code></pre>
          </div>

          <h3>3. Multiple Permissions (Any)</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`<MultiplePermissionsGuard permissions={[PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE]}>
  <UserPanel />
</MultiplePermissionsGuard>`}</code></pre>
          </div>

          <h3>4. Multiple Permissions (All Required)</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`<MultiplePermissionsGuard permissions={[PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE]} requireAll>
  <AdvancedUserPanel />
</MultiplePermissionsGuard>`}</code></pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>🔧 Common Operations</h2>

          <h3>Add New Permission</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// 1. Add to packages/rbac/src/roles.config.ts
export const PERMISSIONS = {
  // ... existing
  ANALYTICS_READ: 'analytics:read',
} as const;

// 2. Assign to roles
Reader: {
  permissions: [PERMISSIONS.USER_READ, PERMISSIONS.ANALYTICS_READ],
},

// 3. Rebuild package
cd packages/rbac && npm run build`}</code></pre>
          </div>

          <h3>Add New Role</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// In packages/rbac/src/roles.config.ts
Moderator: {
  name: "User:Moderator",
  displayName: "User Moderator", 
  description: "Can read users and moderate content",
  permissions: [PERMISSIONS.USER_READ, PERMISSIONS.CONTENT_MODERATE],
  inheritsFrom: ["User:Reader"], // Optional
},`}</code></pre>
          </div>

          <h3>Protect Page Section</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// In page.tsx
<PermissionGuard permission={PERMISSIONS.USER_UPDATE}>
  <EditUserSection />
</PermissionGuard>

<PermissionGuard permission={PERMISSIONS.USER_DELETE}>
  <DeleteUserSection />
</PermissionGuard>`}</code></pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>🧪 Testing</h2>

          <h3>Run Component Tests</h3>
          <ol>
            <li>Go to <Link href="/system/rbac/component-test">/system/rbac/component-test</Link></li>
            <li>Select role from dropdown</li>
            <li>Click "Run Component Access Test"</li>
            <li>Fix any FAILED tests</li>
          </ol>

          <h3>Add to Test Suite</h3>
          <div className={styles.codeBlock}>
            <pre><code>{`// In system/rbac/component-test/page.tsx
"/analytics": {
  title: "Analytics Dashboard",
  description: "View analytics and reports",
  components: [
    { name: "AnalyticsChart", permission: PERMISSIONS.ANALYTICS_READ, description: "Analytics charts" },
    { name: "ExportButton", permission: PERMISSIONS.ANALYTICS_EXPORT, description: "Export data" },
  ],
},`}</code></pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2>📁 File Locations</h2>
          <ul>
            <li><strong>Roles & Permissions</strong>: <code>packages/rbac/src/roles.config.ts</code></li>
            <li><strong>Frontend Service</strong>: <code>app/services/rbac.service.ts</code></li>
            <li><strong>React Guards</strong>: <code>app/components/rbac/guards/</code></li>
            <li><strong>Testing Tools</strong>: <code>app/(cms)/system/rbac/</code></li>
            <li><strong>Documentation</strong>: <code>app/(cms)/documentation/</code></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>🔑 Permission Patterns</h2>

          <h3>Resource Actions</h3>
          <ul>
            <li><code>user:read</code> - Read user data</li>
            <li><code>user:create</code> - Create new users</li>
            <li><code>user:update</code> - Modify existing users</li>
            <li><code>user:delete</code> - Remove users</li>
            <li><code>user:invite</code> - Invite new users</li>
          </ul>

          <h3>Global Actions</h3>
          <ul>
            <li><code>global:read</code> - Read global system info</li>
            <li><code>global:admin</code> - Full system access</li>
          </ul>

          <h3>Tenant Actions</h3>
          <ul>
            <li><code>tenant:read</code> - Read tenant info</li>
            <li><code>tenant:create</code> - Create new tenants</li>
            <li><code>tenant:update</code> - Modify tenant settings</li>
            <li><code>tenant:delete</code> - Remove tenants</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>🎯 Best Practices</h2>
          <ol>
            <li><strong>Always protect</strong> sensitive actions (create, update, delete)</li>
            <li><strong>Use guards</strong> for conditional rendering</li>
            <li><strong>Test thoroughly</strong> with different roles</li>
            <li><strong>Follow naming</strong>: <code>resource:action</code> format</li>
            <li><strong>Principle of least privilege</strong>: Start with minimal permissions</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>🚨 Troubleshooting</h2>

          <h3>Permission Not Working?</h3>
          <ol>
            <li>✅ Permission exists in <code>PERMISSIONS</code></li>
            <li>✅ Role has permission in <code>roles.config.ts</code></li>
            <li>✅ Package rebuilt (<code>npm run build</code> in <code>packages/rbac/</code>)</li>
            <li>✅ Component wrapped with guard</li>
          </ol>

          <h3>Test Failures?</h3>
          <ol>
            <li><strong>Expected vs Actual mismatch</strong>: Check permission logic</li>
            <li><strong>Global Admin issues</strong>: Ensure bypass is working</li>
            <li><strong>Role inheritance</strong>: Verify <code>inheritsFrom</code> relationships</li>
          </ol>

          <h3>Performance Issues?</h3>
          <ol>
            <li>✅ <code>Global:Admin</code> bypass working</li>
            <li>✅ No unnecessary permission iterations</li>
            <li>✅ Monitor for permission bloat</li>
          </ol>
        </section>

        <div className={styles.footer}>
          <p>
            <strong>Remember</strong>: The test suite is your friend! Run it after any RBAC changes to catch issues early.
          </p>
          <div className={styles.links}>
            <Link href="/documentation" className={styles.footerLink}>
              ← Back to Documentation
            </Link>
            <Link href="/documentation/rbac-guide" className={styles.footerLink}>
              Read Full Guide →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
