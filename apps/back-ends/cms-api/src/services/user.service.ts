import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { FirebaseServerClient } from "@keystone/auth";
import { Tenant, TenantMembership } from "@keystone/database";

export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  roles: string[];
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
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

interface FirebaseUsersResponse {
  users: FirebaseUserRecord[];
  nextPageToken?: string;
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
  private readonly logger = new Logger(UserService.name);
  private readonly firebaseClient: FirebaseServerClient;

  constructor() {
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

      // List users from Firebase GIP
      const firebaseUsers = await this.firebaseClient.listUsersInTenant(tenant.gipTenantId, maxResults);

      // Transform Firebase user records to our format with safe property access
      const firebaseResponse = firebaseUsers as FirebaseUsersResponse;
      const users: FirebaseUser[] = await Promise.all(
        firebaseResponse.users?.map(async (user: FirebaseUserRecord) => {
          // Get roles from TenantMembership database (simplified: one user = one tenant)
          const membership = await TenantMembership.findOne({
            userId: user.uid,
            isActive: true
          });
          const roles = membership?.roles || [];

          return {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            disabled: user.disabled,
            roles,
            metadata: {
              creationTime: user.metadata?.creationTime || new Date().toISOString(),
              lastSignInTime: user.metadata?.lastSignInTime || "",
            },
          };
        }) || []
      );

      this.logger.log(`✅ Found ${users.length} users in tenant ${tenantId}`);

      return {
        users,
        total: users.length,
        nextPageToken: firebaseResponse.nextPageToken,
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

      const user: FirebaseUser = {
        uid: firebaseUserRecord.uid,
        email: firebaseUserRecord.email,
        emailVerified: firebaseUserRecord.emailVerified,
        displayName: firebaseUserRecord.displayName,
        photoURL: firebaseUserRecord.photoURL,
        disabled: firebaseUserRecord.disabled,
        roles,
        metadata: {
          creationTime: firebaseUserRecord.metadata?.creationTime || new Date().toISOString(),
          lastSignInTime: firebaseUserRecord.metadata?.lastSignInTime || "",
        },
      };

      this.logger.log(`✅ Found user ${uid} in tenant ${tenantId}`);
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

      // Set up initial roles (default to "member" if none specified)
      const initialRoles = request.roles && request.roles.length > 0 ? request.roles : ["member"];

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
        roles: initialRoles,
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

      // Update roles in TenantMembership if provided (simplified: one user = one tenant)
      if (newRoles !== undefined) {
        await TenantMembership.findOneAndUpdate(
          { userId: uid, isActive: true },
          { roles: newRoles },
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
        { roles },
        { new: true }
      );

      this.logger.log(`✅ Set roles for user ${uid} in tenant ${tenantId}: ${roles.join(", ")}`);
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
