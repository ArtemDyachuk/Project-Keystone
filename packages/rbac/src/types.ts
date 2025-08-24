export interface RoleDefinition {
   name: string;
   displayName: string;
   description: string;
   permissions: string[];
   inheritsFrom?: string[];
}

export interface ResourceRoles {
   [resourceType: string]: {
      [roleName: string]: RoleDefinition;
   };
}

export interface RoleConfig {
   resources: ResourceRoles;
   allRoles: string[];
   roleHierarchy: Map<string, string[]>;
}

export interface RoleOption {
   value: string;
   label: string;
   category: string;
   description: string;
}
