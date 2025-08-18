import { Injectable } from '@nestjs/common';

interface StytchUser {
  user_id: string;
  name?: string;
  emails: Array<{ email: string; verified: boolean }>;
  organization_id?: string;
}

interface StytchSession {
  session_token: string;
  user: StytchUser;
}

interface StytchError {
  error_message?: string;
  error_type?: string;
  status_code?: number;
}

@Injectable()
export class AuthService {
  private readonly stytchProjectId = process.env.STYTCH_PROJECT_ID;
  private readonly stytchSecret = process.env.STYTCH_SECRET;
  private readonly stytchBaseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.stytch.com' 
    : 'https://test.stytch.com';

  async signUp(email: string, password: string, name?: string): Promise<StytchSession> {
    console.log('Stytch B2B signup attempt:', { email, name, hasPassword: !!password });
    console.log('Stytch config:', {
      projectId: this.stytchProjectId,
      hasSecret: !!this.stytchSecret,
      baseUrl: this.stytchBaseUrl
    });

    try {
      // Since we can't list/search organizations due to 405 errors,
      // we'll try to create a member in your existing organization first
      const existingOrgId = 'organization-test-f764daf3-09bc-445d-befb-ebe7c0a0c0fa';
      
      console.log(`Trying to add user to existing organization: ${existingOrgId}`);
      
      const existingMemberResponse = await fetch(`${this.stytchBaseUrl}/v1/b2b/organizations/${existingOrgId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          name: name || undefined,
          is_breakglass: false,
        }),
      });

      console.log('Stytch add to existing org response status:', existingMemberResponse.status);

      if (existingMemberResponse.ok) {
        const memberResult = await existingMemberResponse.json() as any;
        console.log('User added to existing organization:', memberResult);
        
        return {
          session_token: '',
          user: {
            user_id: memberResult.member.member_id,
            emails: [{ email, verified: false }],
            name,
            organization_id: existingOrgId
          }
        } as StytchSession;
      } else {
        const error = await existingMemberResponse.json() as StytchError;
        console.log('Failed to add to existing org (user might already exist):', error.error_message);
        
        // If user already exists in the organization
        if (error.error_message?.includes('already exists') || error.error_message?.includes('duplicate')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
      }

      // If adding to existing org failed for other reasons, create new organization
      const orgName = `${name || email.split('@')[0]}'s Organization`;
      const orgResponse = await fetch(`${this.stytchBaseUrl}/v1/b2b/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_name: orgName,
          organization_slug: `${email.split('@')[0]}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        }),
      });

      console.log('Stytch organization create response status:', orgResponse.status);

      if (!orgResponse.ok) {
        const error = await orgResponse.json() as StytchError;
        console.error('Stytch organization create error:', error);
        throw new Error(error.error_message || `Organization creation failed: ${orgResponse.status}`);
      }

      const orgResult = await orgResponse.json() as any;
      console.log('Stytch organization create success:', orgResult);
      const organizationId = orgResult.organization.organization_id;

      // Create member in the new organization
      const memberResponse = await fetch(`${this.stytchBaseUrl}/v1/b2b/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          name: name || undefined,
          is_breakglass: false,
        }),
      });

      console.log('Stytch member create response status:', memberResponse.status);

      if (!memberResponse.ok) {
        const error = await memberResponse.json() as StytchError;
        console.error('Stytch member create error:', error);
        throw new Error(error.error_message || `Member creation failed: ${memberResponse.status}`);
      }

      const memberResult = await memberResponse.json() as any;
      console.log('Stytch member create success:', memberResult);

      return {
        session_token: '',
        user: {
          user_id: memberResult.member.member_id,
          emails: [{ email, verified: false }],
          name,
          organization_id: organizationId
        }
      } as StytchSession;

    } catch (error) {
      console.error('B2B signup failed:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<StytchSession> {
    console.log('Stytch B2B signin attempt:', { email, hasPassword: !!password });

    // Since we can't list organizations, try the known ones
    const knownOrganizations = [
      'organization-test-f764daf3-09bc-445d-befb-ebe7c0a0c0fa', // Your existing org
      // Add any new organization IDs created during signup
    ];

    for (const orgId of knownOrganizations) {
      try {
        console.log(`Trying B2B signin for organization: ${orgId}`);
        
        const response = await fetch(`${this.stytchBaseUrl}/v1/b2b/passwords/authenticate`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organization_id: orgId,
            email_address: email,
            password,
          }),
        });

        console.log(`B2B signin response status for ${orgId}:`, response.status);

        if (response.ok) {
          const result = await response.json() as any;
          console.log('Stytch B2B signin success:', result);
          return result as StytchSession;
        } else {
          const error = await response.json() as StytchError;
          console.log(`B2B signin failed for ${orgId}:`, error.error_message);
        }
      } catch (error) {
        console.log(`Error trying signin for organization ${orgId}:`, error);
      }
    }

    throw new Error('Authentication failed - invalid email or password, or user needs to set password');
  }

  async signOut(sessionToken: string): Promise<{ success: boolean }> {
    if (!sessionToken) return { success: true };

    try {
      // Try B2B session revoke first
      await fetch(`${this.stytchBaseUrl}/v1/b2b/sessions/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: sessionToken,
        }),
      });
    } catch {
      // Try regular session revoke
      try {
        await fetch(`${this.stytchBaseUrl}/v1/sessions/revoke`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_token: sessionToken,
          }),
        });
      } catch (revokeError) {
        console.warn('Failed to revoke session:', revokeError);
      }
    }

    return { success: true };
  }

  async validateSession(sessionToken: string): Promise<StytchSession | null> {
    if (!sessionToken) return null;

    try {
      // Try B2B session validation first
      const response = await fetch(`${this.stytchBaseUrl}/v1/b2b/sessions/authenticate`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: sessionToken,
        }),
      });

      if (response.ok) {
        return response.json() as Promise<StytchSession>;
      }
    } catch {
      console.log('B2B session validation failed');
    }

    // Fallback: try regular session validation
    try {
      const response = await fetch(`${this.stytchBaseUrl}/v1/sessions/authenticate`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: sessionToken,
        }),
      });

      if (!response.ok) return null;

      return response.json() as Promise<StytchSession>;
    } catch {
      return null;
    }
  }

  async getOrganizations(): Promise<any[]> {
    try {
      const response = await fetch(`${this.stytchBaseUrl}/v1/b2b/organizations`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Get organizations response status:', response.status);

      if (!response.ok) {
        const error = await response.json() as any;
        console.error('Failed to get organizations:', response.status, error);
        return [];
      }

      const result = await response.json() as any;
      console.log('Organizations response:', result);
      return result.organizations || [];
    } catch (error) {
      console.error('Error getting organizations:', error);
      return [];
    }
  }

  async createOrganization(name: string): Promise<any> {
    try {
      const response = await fetch(`${this.stytchBaseUrl}/v1/b2b/organizations/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.stytchProjectId}:${this.stytchSecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_name: name,
        }),
      });

      console.log('Stytch create organization response status:', response.status);

      if (!response.ok) {
        const error = await response.json() as StytchError;
        console.error('Failed to create organization:', error);
        throw new Error(error.error_message || `Stytch API error: ${response.status}`);
      }

      const result = await response.json() as any;
      console.log('Organization created:', result);
      return result;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }


}
