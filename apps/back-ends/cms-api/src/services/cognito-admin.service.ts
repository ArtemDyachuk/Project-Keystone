import { Injectable } from "@nestjs/common";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";


@Injectable()
export class CognitoAdminService {
  private client: CognitoIdentityProviderClient;

  constructor() {
    const config: any = {
      region: process.env.AWS_REGION || "us-east-1",
    };

    // AWS SDK will automatically use AWS_PROFILE environment variable
    this.client = new CognitoIdentityProviderClient(config);
  }

  /**
   * Update user's tenant attributes in Cognito
   */
  async updateUserTenants(
    userPoolId: string,
    username: string,
    tenantIds: string[],
    selectedTenantId: string
  ): Promise<void> {
    // Convert MongoDB ObjectIds to strings for Cognito
    const tenantIdsString = tenantIds.map(id => id.toString()).join(",");
    const selectedTenantIdString = selectedTenantId.toString();

    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [
        {
          Name: "custom:tenantIds",
          Value: tenantIdsString
        },
        {
          Name: "custom:selectedTenantId",
          Value: selectedTenantIdString
        }
      ]
    });

    await this.client.send(command);
  }

  /**
   * Get user attributes from Cognito
   */
  async getUserAttributes(userPoolId: string, username: string): Promise<Record<string, string>> {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });

    const result = await this.client.send(command);
    const attributes = result.UserAttributes || [];

    const attributeMap: Record<string, string> = {};
    attributes.forEach((attr: AttributeType) => {
      if (attr.Name && attr.Value) {
        attributeMap[attr.Name] = attr.Value;
      }
    });

    return attributeMap;
  }

  /**
   * Get user's current tenant information
   */
  async getUserTenantInfo(userPoolId: string, username: string): Promise<{
    tenantIds: string[];
    selectedTenantId: string | null;
  }> {
    const attributes = await this.getUserAttributes(userPoolId, username);

    const tenantIds = attributes["custom:tenantIds"]?.split(",").filter(Boolean) || [];
    const selectedTenantId = attributes["custom:selectedTenantId"] || null;

    return {
      tenantIds,
      selectedTenantId
    };
  }

  /**
   * Add a new tenant to user's tenant list
   */
  async addUserTenant(
    userPoolId: string,
    username: string,
    newTenantId: string
  ): Promise<void> {
    const currentInfo = await this.getUserTenantInfo(userPoolId, username);

    // Add new tenant if not already present
    if (!currentInfo.tenantIds.includes(newTenantId)) {
      const updatedTenantIds = [...currentInfo.tenantIds, newTenantId];

      await this.updateUserTenants(
        userPoolId,
        username,
        updatedTenantIds,
        newTenantId // Set as selected tenant
      );
    }
  }

  /**
   * Update user's selected tenant
   */
  async updateSelectedTenant(
    userPoolId: string,
    username: string,
    selectedTenantId: string
  ): Promise<void> {
    const currentInfo = await this.getUserTenantInfo(userPoolId, username);

    // Verify user has access to this tenant
    if (!currentInfo.tenantIds.includes(selectedTenantId)) {
      throw new Error(`User does not have access to tenant: ${selectedTenantId}`);
    }

    await this.updateUserTenants(
      userPoolId,
      username,
      currentInfo.tenantIds,
      selectedTenantId
    );
  }


}
