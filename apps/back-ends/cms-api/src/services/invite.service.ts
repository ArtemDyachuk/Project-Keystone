import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { SignupService } from "./signup.service";
import { TenantService } from "./tenant.service";
import { UserService } from "./user.service";
import { FirebaseServerClient } from "@keystone/auth";

export interface CreateInviteDto {
   email: string;
   firstName: string;
   lastName: string;
   roles: string[];
}

@Injectable()
export class InviteService {
   private readonly logger = new Logger(InviteService.name);
   private readonly firebaseClient: FirebaseServerClient;

   constructor(
      private readonly signupService: SignupService,
      private readonly tenantService: TenantService,
      private readonly userService: UserService,
   ) {
      this.firebaseClient = new FirebaseServerClient();
   }

   /**
    * Create and send a user invite
    */
   async createInvite(inviteDto: CreateInviteDto, invitedBy: string, _tenantId: string): Promise<void> {
      try {
         this.logger.log(`🔄 Creating invite for ${inviteDto.email}`);

         // Use the unified SignupService for invite creation
         await this.signupService.initiateInvite({
            email: inviteDto.email,
            firstName: inviteDto.firstName,
            lastName: inviteDto.lastName,
            roles: inviteDto.roles,
            invitedBy: invitedBy,
            tenantId: _tenantId, // Pass the tenant ID for separation
         });

         this.logger.log(`✅ Invite created and email sent to ${inviteDto.email}`);
      } catch (error) {
         this.logger.error(`❌ Failed to create invite for ${inviteDto.email}:`, error);
         throw error;
      }
   }

   /**
    * Accept an invite by setting password and activating the user
    */
   async acceptInvite(token: string, password: string): Promise<void> {
      try {
         this.logger.log(`🔄 Accepting invite with token: ${token.substring(0, 8)}...`);

         // Verify the token using SignupService
         const verificationData = await this.signupService.verifyToken(token);

         if (verificationData.type !== "invite") {
            throw new HttpException("Invalid token type - expected invite", HttpStatus.BAD_REQUEST);
         }

         if (!verificationData.roles || !verificationData.invitedBy) {
            throw new HttpException("Invalid invite data", HttpStatus.BAD_REQUEST);
         }

         // Get the tenant information from the verification record
         const { Tenant } = await import("@keystone/database");
         const inviterTenant = await Tenant.findById(verificationData.tenantId);

         if (!inviterTenant?.gipTenantId) {
            throw new HttpException("Inviter's tenant not found", HttpStatus.NOT_FOUND);
         }

         // Create user in Firebase GIP tenant
         const userRecord = await this.firebaseClient.createUserWithoutPassword({
            email: verificationData.email,
            firstName: verificationData.firstName || "",
            lastName: verificationData.lastName || "",
            tenantId: inviterTenant.gipTenantId,
         });

         // Set the user's password
         await this.firebaseClient.setUserPassword(
            userRecord.uid,
            password,
            inviterTenant.gipTenantId
         );

         // Enable the user
         await this.firebaseClient.updateUser(
            userRecord.uid,
            { disabled: false, emailVerified: true },
            inviterTenant.gipTenantId
         );

         // Create TenantMembership in database
         await this.tenantService.addUserToTenant(
            userRecord.uid,
            inviterTenant._id.toString(),
            verificationData.roles
         );

         // Delete the verification record
         await this.signupService.deleteVerification(token);

         this.logger.log(`✅ Invite accepted successfully for user ${userRecord.uid}`);
      } catch (error) {
         this.logger.error(`❌ Failed to accept invite:`, error);
         throw error;
      }
   }

   /**
    * Cancel an invite by deleting the verification record
    */
   async cancelInvite(token: string): Promise<void> {
      try {
         this.logger.log(`🔄 Cancelling invite with token: ${token.substring(0, 8)}...`);

         // Verify the token first to get user info
         const verificationData = await this.signupService.verifyToken(token);

         if (verificationData.type !== "invite") {
            throw new HttpException("Invalid token type - expected invite", HttpStatus.BAD_REQUEST);
         }

         // Delete the verification record
         await this.signupService.deleteVerification(token);

         this.logger.log(`✅ Invite cancelled for ${verificationData.email}`);
      } catch (error) {
         this.logger.error(`❌ Failed to cancel invite:`, error);
         throw error;
      }
   }

   /**
    * Cancel an invite by UID (for backward compatibility)
    */
   async cancelInviteByUid(uid: string, tenantId: string): Promise<void> {
      try {
         this.logger.log(`🔄 Cancelling invite for user ${uid} in tenant ${tenantId}`);

         // Check if this is a pending invite (UID starts with 'invite-')
         if (uid.startsWith('invite-')) {
            // This is a pending invite, just delete the verification record
            const inviteId = uid.replace('invite-', '');
            const { SignupVerification } = await import("@keystone/database");
            
            const deleted = await SignupVerification.findByIdAndDelete(inviteId);
            if (deleted) {
               this.logger.log(`✅ Successfully cancelled pending invite for ${deleted.email}`);
            } else {
               this.logger.log(`⚠️ Pending invite not found for ID: ${inviteId}`);
            }
            return;
         }

         // This is an active user, proceed with Firebase deletion
         const { Tenant } = await import("@keystone/database");
         const tenant = await Tenant.findById(tenantId);
         if (!tenant?.gipTenantId) {
            throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
         }

         // Get user to check if they're actually invited
         const user = await this.userService.getUserById(uid, tenantId);

         if (user.inviteStatus !== "invited") {
            throw new HttpException("User is not in invited status", HttpStatus.BAD_REQUEST);
         }

         // Delete user from Firebase GIP
         await this.firebaseClient.deleteUser(uid, tenant.gipTenantId);

         // Remove TenantMembership if it exists
         const { TenantMembership } = await import("@keystone/database");
         await TenantMembership.findOneAndDelete({
            userId: uid,
            tenantId: tenant._id
         });

         this.logger.log(`✅ Successfully cancelled invite for user ${uid}`);
      } catch (error) {
         this.logger.error(`❌ Failed to cancel invite for user ${uid}:`, error);
         throw error;
      }
   }
}
