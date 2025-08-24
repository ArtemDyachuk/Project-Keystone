import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FirebaseServerClient } from '@keystone/auth';
import { Tenant, TenantMembership, SignupVerification } from '@keystone/database';
import { Types } from 'mongoose';
import { SessionService } from './session.service';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  roles: string[];
  inviteStatus: "invited" | "active";
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  // Additional fields for pending invites
  isPendingInvite?: boolean;
  inviteId?: string;
  invitedBy?: string;
}

interface FirebaseUserRecord {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export interface CreateUserRequest {
  email: string;
  displayName?: string;
  password?: string;
  roles?: string[];
  tenantId: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  email?: string;
  disabled?: boolean;
  roles?: string[];
}

export interface UserListResponse {
  users: FirebaseUser[];
  total: number;
  nextPageToken?: string;
}

@Injectable()
export class UserService {
  private readonly firebaseClient: FirebaseServerClient;
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly sessionService: SessionService
  ) {
    this.firebaseClient = new FirebaseServerClient();
  }

  /**
   * Get all users in a tenant
   */
  async getUsersInTenant(tenantId: string, maxResults = 1000): Promise<UserListResponse> {
    try {
      this.logger.log(`🔄 Fetching users for tenant: ${tenantId}`);

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Get users from Firebase GIP tenant
      const firebaseUsers = await this.firebaseClient.listUsersInTenant(tenant.gipTenantId, maxResults);

      // Parse Firebase Admin SDK response structure

      // Firebase Admin SDK listUsers() returns { users: UserRecord[], nextPageToken?: string }
      let usersArray: FirebaseUserRecord[] = [];
      let nextPageToken: string | undefined = undefined;

      if (firebaseUsers && typeof firebaseUsers === 'object') {
        if ('users' in firebaseUsers && Array.isArray((firebaseUsers as any).users)) {
          // Standard Firebase Admin SDK response
          usersArray = (firebaseUsers as any).users;
          nextPageToken = (firebaseUsers as any).nextPageToken || undefined;
        } else if (Array.isArray(firebaseUsers)) {
          // Direct array response (fallback)
          usersArray = firebaseUsers;
        } else {
          // Try to find users in the response object
          const possibleUsers = Object.values(firebaseUsers).find(val => Array.isArray(val));
          if (possibleUsers) {
            usersArray = possibleUsers as FirebaseUserRecord[];
          }
        }
      }

      if (!Array.isArray(usersArray)) {
        this.logger.error(`❌ Unexpected Firebase users response structure:`, firebaseUsers);
        throw new HttpException("Unexpected response structure from Firebase", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Found users in Firebase response

      // Handle case where no users exist yet
      if (usersArray.length === 0) {
        return {
          users: [],
          total: 0,
          nextPageToken: undefined,
        };
      }

      // Transform Firebase users to our format with roles and invite status
      const users = await Promise.all(
        usersArray.map(async (user: FirebaseUserRecord) => {
          // Get roles from TenantMembership database
          const membership = await TenantMembership.findOne({
            userId: user.uid,
            isActive: true
          });
          const roles = membership?.roles || [];

          // Check if user has a pending invite by looking for SignupVerification record
          const pendingInvite = await SignupVerification.findOne({
            email: user.email,
            type: "invite",
            tenantId: tenantId, // Only check invites for this tenant
            expiresAt: { $gt: new Date() } // Not expired
          });

          // Determine invite status based on database records, not Firebase custom claims
          const inviteStatus: "invited" | "active" = pendingInvite ? "invited" : "active";

          return {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            disabled: user.disabled,
            roles,
            inviteStatus,
            metadata: {
              creationTime: user.metadata?.creationTime || new Date().toISOString(),
              lastSignInTime: user.metadata?.lastSignInTime || "",
            },
          };
        }) || []
      );

      // Get pending invites that don't have Firebase users yet
      const pendingInvites = await SignupVerification.find({
        type: "invite",
        tenantId: new Types.ObjectId(tenantId), // Convert string to ObjectId
        expiresAt: { $gt: new Date() } // Not expired
      });

      // Transform pending invites to user format
      const inviteUsers = pendingInvites.map(invite => ({
        uid: `invite-${invite._id?.toString() || 'unknown'}`, // Temporary ID for invites
        email: invite.email,
        emailVerified: false,
        displayName: `${invite.firstName || ''} ${invite.lastName || ''}`.trim() || invite.email,
        photoURL: null,
        disabled: true,
        roles: invite.roles || ["Tenant:Reader"],
        inviteStatus: "invited" as const,
        metadata: {
          creationTime: invite.createdAt.toISOString(),
          lastSignInTime: "",
        },
        isPendingInvite: true, // Flag to identify pending invites
        inviteId: invite._id?.toString() || '',
        invitedBy: invite.invitedBy,
      }));

      // Combine Firebase users and pending invites
      const allUsers = [...users, ...inviteUsers];

      // Found users and pending invites

      return {
        users: allUsers,
        total: allUsers.length,
        nextPageToken: nextPageToken,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get users for tenant ${tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to fetch users",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a specific user by UID
   */
  async getUserById(uid: string, tenantId: string): Promise<FirebaseUser> {
    try {
      this.logger.log(`🔄 Fetching user ${uid} from tenant: ${tenantId}`);

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Get user from Firebase GIP
      const firebaseUser = await this.firebaseClient.getUserByUid(uid, tenant.gipTenantId);

      if (!firebaseUser) {
        throw new HttpException("User not found", HttpStatus.NOT_FOUND);
      }

      // Transform to our format with safe property access
      const firebaseUserRecord = firebaseUser as FirebaseUserRecord;

      // Get roles from TenantMembership database (simplified: one user = one tenant)
      const membership = await TenantMembership.findOne({
        userId: uid,
        isActive: true
      });
      const roles = membership?.roles || [];

      // Check if user has a pending invite by looking for SignupVerification record
      const pendingInvite = await SignupVerification.findOne({
        email: firebaseUserRecord.email,
        type: "invite",
        expiresAt: { $gt: new Date() } // Not expired
      });

      // Determine invite status based on database records, not Firebase custom claims
      const inviteStatus: "invited" | "active" = pendingInvite ? "invited" : "active";

      // Return the user with roles
      const user: FirebaseUser = {
        uid: firebaseUserRecord.uid,
        email: firebaseUserRecord.email,
        emailVerified: firebaseUserRecord.emailVerified,
        displayName: firebaseUserRecord.displayName,
        photoURL: firebaseUserRecord.photoURL,
        disabled: firebaseUserRecord.disabled,
        roles,
        inviteStatus,
        metadata: {
          creationTime: firebaseUserRecord.metadata?.creationTime || new Date().toISOString(),
          lastSignInTime: firebaseUserRecord.metadata?.lastSignInTime || "",
        },
      };

      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to get user ${uid} from tenant ${tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to fetch user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new user in the tenant
   */
  async createUser(request: CreateUserRequest): Promise<FirebaseUser> {
    try {
      this.logger.log(`🔄 Creating user ${request.email} in tenant: ${request.tenantId}`);

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(request.tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Create user in Firebase GIP
      const firebaseUser = await this.firebaseClient.createUserWithoutPassword({
        email: request.email,
        firstName: request.displayName?.split(" ")[0] || "",
        lastName: request.displayName?.split(" ")[1] || "",
        tenantId: tenant.gipTenantId,
      });

      // Set up initial roles (default to "Tenant:Reader" if none specified)
      const initialRoles = request.roles && request.roles.length > 0 ? request.roles : ["Tenant:Reader"];

      // Validate and sanitize the roles
      const validatedRoles = this.validateAndSanitizeRoles(initialRoles);
      if (validatedRoles.length === 0) {
        throw new HttpException("No valid roles provided", HttpStatus.BAD_REQUEST);
      }

      // Create TenantMembership record with roles (simplified: one user = one tenant)
      await TenantMembership.findOneAndUpdate(
        { userId: firebaseUser.uid },
        {
          userId: firebaseUser.uid,
          tenantId: tenant._id,
          roles: initialRoles,
          isActive: true,
          joinedAt: new Date()
        },
        { upsert: true, new: true }
      );

      this.logger.log(`✅ Created user ${request.email} in tenant ${request.tenantId} with roles: ${initialRoles.join(", ")}`);

      // Return the created user
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        disabled: false,
        roles: validatedRoles,
        inviteStatus: "active", // New users are active by default
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: "",
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create user ${request.email} in tenant ${request.tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to create user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(uid: string, updates: UpdateUserRequest, tenantId: string): Promise<FirebaseUser> {
    try {
      this.logger.log(`🔄 Updating user ${uid} in tenant: ${tenantId}`);

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Update user in Firebase GIP (exclude roles from Firebase update)
      const { roles: newRoles, ...firebaseUpdates } = updates;
      const firebaseUser = await this.firebaseClient.updateUser(uid, firebaseUpdates, tenant.gipTenantId);

      // If user is being disabled, invalidate all their sessions
      if (firebaseUpdates.disabled === true) {
        this.logger.log(`🚫 User ${uid} is being disabled, invalidating sessions...`);
        
        // Invalidate sessions and mark user as invalidated
        const deletedSessions = await this.sessionService.invalidateUserSessions(
          uid, 
          `User disabled in tenant ${tenantId}`,
          tenantId
        );
        
        this.logger.log(`🚫 Invalidated ${deletedSessions} sessions for disabled user ${uid}`);
      }

      // Update roles in TenantMembership if provided (simplified: one user = one tenant)
      if (newRoles !== undefined) {
        // Validate and sanitize the roles
        const validatedRoles = this.validateAndSanitizeRoles(newRoles);
        if (validatedRoles.length === 0) {
          throw new HttpException("No valid roles provided", HttpStatus.BAD_REQUEST);
        }

        await TenantMembership.findOneAndUpdate(
          { userId: uid, isActive: true },
          { roles: validatedRoles },
          { new: true }
        );
      }

      this.logger.log(`✅ Updated user ${uid} in tenant ${tenantId}`);

      // Return the updated user with safe property access
      const firebaseUserRecord = firebaseUser as FirebaseUserRecord;

      // Get updated roles from database (simplified: one user = one tenant)
      const membership = await TenantMembership.findOne({
        userId: uid,
        isActive: true
      });
      const roles = membership?.roles || [];

      return {
        uid: firebaseUserRecord.uid,
        email: firebaseUserRecord.email,
        emailVerified: firebaseUserRecord.emailVerified,
        displayName: firebaseUserRecord.displayName,
        photoURL: firebaseUserRecord.photoURL,
        disabled: firebaseUserRecord.disabled,
        roles,
        // Check custom claims for invite status instead of just disabled
        inviteStatus: (firebaseUserRecord as any).customClaims?.invited ? "invited" : "active",
        metadata: {
          creationTime: firebaseUserRecord.metadata?.creationTime || new Date().toISOString(),
          lastSignInTime: firebaseUserRecord.metadata?.lastSignInTime || "",
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to update user ${uid} in tenant ${tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to update user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Set user roles
   */
  async setUserRoles(uid: string, roles: string[], tenantId: string): Promise<void> {
    try {
      this.logger.log(`🔄 Setting roles for user ${uid} in tenant: ${tenantId}`);

      // Validate and sanitize the roles
      const validatedRoles = this.validateAndSanitizeRoles(roles);
      if (validatedRoles.length === 0) {
        throw new HttpException("No valid roles provided", HttpStatus.BAD_REQUEST);
      }

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Update roles in TenantMembership database (simplified: one user = one tenant)
      await TenantMembership.findOneAndUpdate(
        { userId: uid, isActive: true },
        { roles: validatedRoles },
        { new: true }
      );

      this.logger.log(`✅ Set roles for user ${uid} in tenant ${tenantId}: ${validatedRoles.join(", ")}`);
    } catch (error) {
      this.logger.error(`❌ Failed to set roles for user ${uid} in tenant ${tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to set user roles",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate and sanitize roles before assignment
   */
  validateAndSanitizeRoles(roles: string[]): string[] {
    // This function is no longer needed as roleHasPermission is removed.
    // Keeping it for now as it might be used elsewhere or for future RBAC logic.
    // For now, it will return the input roles as they are.
    return roles;
  }

  /**
   * Delete a user from the tenant
   */
  async deleteUser(uid: string, tenantId: string): Promise<void> {
    try {
      this.logger.log(`🔄 Deleting user ${uid} from tenant: ${tenantId}`);

      // Get the Firebase GIP tenant ID from the database tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
      }

      if (!tenant.gipTenantId) {
        throw new HttpException("Tenant not properly configured with Firebase GIP", HttpStatus.BAD_REQUEST);
      }

      // Delete user from Firebase GIP
      await this.firebaseClient.deleteUser(uid, tenant.gipTenantId);

      // Automatically invalidate all sessions for this user
      const deletedSessions = await this.sessionService.invalidateUserSessions(
        uid, 
        `User deleted from tenant ${tenantId}`,
        tenantId
      );
      
      this.logger.log(`🗑️ Invalidated ${deletedSessions} sessions for deleted user ${uid}`);

      this.logger.log(`✅ Deleted user ${uid} from tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete user ${uid} from tenant ${tenantId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        "Failed to delete user",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}