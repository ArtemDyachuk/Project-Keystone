#!/bin/bash

# Simple AWS Cognito Setup Script
# Creates Cognito User Pool using AWS CLI (Infrastructure as Code)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Simple AWS Cognito Setup${NC}"
echo "==============================="
echo ""
echo "Usage: ./setup-cognito.sh [environment] [aws-profile]"
echo "Examples:"
echo "  ./setup-cognito.sh development"
echo "  ./setup-cognito.sh development my-personal-profile"
echo "  ./setup-cognito.sh production company-prod-profile"
echo ""

# Environment setup
ENVIRONMENT=${1:-development}
AWS_PROFILE=${2:-""}
REGION=${AWS_REGION:-us-east-1}
USER_POOL_NAME="keystone-${ENVIRONMENT}-users"
if [ "$ENVIRONMENT" = "production" ]; then
    USER_POOL_NAME="keystone-prod-users"
fi
CLIENT_NAME="keystone-${ENVIRONMENT}-client"
DOMAIN_PREFIX="keystone-${ENVIRONMENT}-auth-$(date +%s)"

echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
if [ ! -z "$AWS_PROFILE" ]; then
    echo -e "${BLUE}AWS Profile:${NC} $AWS_PROFILE"
    export AWS_PROFILE=$AWS_PROFILE
fi
echo -e "${BLUE}Region:${NC} $REGION"
echo -e "${BLUE}User Pool:${NC} $USER_POOL_NAME"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI is not installed${NC}"
    echo -e "${YELLOW}Please install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
    echo -e "${YELLOW}Please run: aws configure${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account:${NC} $ACCOUNT_ID"

# Create User Pool
echo -e "${BLUE}📋 Creating Cognito User Pool...${NC}"
USER_POOL_OUTPUT=$(aws cognito-idp create-user-pool \
    --pool-name "$USER_POOL_NAME" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": true
        }
    }' \
    --mfa-configuration OPTIONAL \
    --user-pool-add-ons '{
        "AdvancedSecurityMode": "ENFORCED"
    }' \
    --auto-verified-attributes email \
    --alias-attributes email \
    --email-configuration '{
        "EmailSendingAccount": "COGNITO_DEFAULT"
    }' \
    --account-recovery-setting '{
        "RecoveryMechanisms": [
            {
                "Priority": 1,
                "Name": "verified_email"
            }
        ]
    }' \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "given_name",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "family_name",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "tenantIds",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true,
            "StringAttributeConstraints": {
                "MaxLength": "1000"
            }
        },
        {
            "Name": "selectedTenantId",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true,
            "StringAttributeConstraints": {
                "MaxLength": "100"
            }
        }
    ]' \
    --user-pool-tags Project=Keystone,Environment=$ENVIRONMENT,ManagedBy=Script \
    --region $REGION)

USER_POOL_ID=$(echo $USER_POOL_OUTPUT | jq -r '.UserPool.Id')
echo -e "${GREEN}✅ User Pool created:${NC} $USER_POOL_ID"

# Create User Pool Domain
echo -e "${BLUE}🌐 Creating User Pool Domain...${NC}"
aws cognito-idp create-user-pool-domain \
    --domain "$DOMAIN_PREFIX" \
    --user-pool-id "$USER_POOL_ID" \
    --region $REGION

echo -e "${GREEN}✅ Domain created:${NC} $DOMAIN_PREFIX.auth.$REGION.amazoncognito.com"

# Create User Pool Client
echo -e "${BLUE}📱 Creating User Pool Client...${NC}"
CLIENT_OUTPUT=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --generate-secret \
    --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_CUSTOM_AUTH ALLOW_USER_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --supported-identity-providers COGNITO \
    --callback-urls "http://localhost:3000/auth/callback" "https://project-keystone-six.vercel.app/auth/callback" \
    --logout-urls "http://localhost:3000" "https://project-keystone-six.vercel.app" \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes email openid profile aws.cognito.signin.user.admin \
    --allowed-o-auth-flows-user-pool-client \
    --prevent-user-existence-errors ENABLED \
    --access-token-validity 24 \
    --id-token-validity 24 \
    --refresh-token-validity 30 \
    --token-validity-units '{
        "AccessToken": "hours",
        "IdToken": "hours", 
        "RefreshToken": "days"
    }' \
    --region $REGION)

CLIENT_ID=$(echo $CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientId')
CLIENT_SECRET=$(echo $CLIENT_OUTPUT | jq -r '.UserPoolClient.ClientSecret')

echo -e "${GREEN}✅ Client created:${NC} $CLIENT_ID"

# Output environment variables
echo ""
echo -e "${GREEN}🎉 Cognito setup completed successfully!${NC}"
echo "========================================"
echo -e "${BLUE}User Pool ID:${NC} $USER_POOL_ID"
echo -e "${BLUE}Client ID:${NC} $CLIENT_ID"
echo -e "${BLUE}Domain:${NC} https://$DOMAIN_PREFIX.auth.$REGION.amazoncognito.com"
echo -e "${BLUE}Region:${NC} $REGION"
echo ""
echo -e "${YELLOW}📝 Environment Variables (.env.local):${NC}"
echo "COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "COGNITO_CLIENT_ID=$CLIENT_ID"
echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET"
echo "COGNITO_DOMAIN=$DOMAIN_PREFIX"
echo "AWS_REGION=$REGION"
echo ""
echo -e "${YELLOW}📝 For Vercel (add these in dashboard):${NC}"
echo "COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "COGNITO_CLIENT_ID=$CLIENT_ID" 
echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET"
echo "COGNITO_DOMAIN=$DOMAIN_PREFIX"
echo "AWS_REGION=$REGION"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"
echo "NEXT_PUBLIC_COGNITO_DOMAIN=https://$DOMAIN_PREFIX.auth.$REGION.amazoncognito.com"
echo ""
echo -e "${YELLOW}📝 For Render (add these in dashboard):${NC}"
echo "COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "COGNITO_CLIENT_ID=$CLIENT_ID"
echo "COGNITO_CLIENT_SECRET=$CLIENT_SECRET" 
echo "COGNITO_DOMAIN=$DOMAIN_PREFIX"
echo "AWS_REGION=$REGION"
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Copy environment variables to your .env file (project root)"
echo "2. Add environment variables to Vercel dashboard"
echo "3. Add environment variables to Render dashboard"
echo "4. Test authentication in your app!"
echo ""
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo "# Test sign up with your auth package:"
echo "# await authClient.signUp({ email: 'test@example.com', password: 'Test123!' })"
echo "# Check email for 6-digit verification code"
echo "# await authClient.confirmSignUp({ username: 'generatedUsername', confirmationCode: '123456' })"
echo ""
echo -e "${BLUE}🔐 Security Features Enabled:${NC}"
echo "✅ Multiple auth flows (password, SRP, custom, WebAuthn-ready)"
echo "✅ Advanced Security Mode (bot detection, risk analysis)"
echo "✅ MFA ready (TOTP apps, SMS)"
echo "✅ Passkey/WebAuthn ready (ALLOW_USER_AUTH flow)"
echo "✅ Email alias support"
echo "✅ Multi-tenancy support (tenantIds, selectedTenantId)"
echo ""
echo -e "${BLUE}🔧 To Add Custom Attributes to Existing User Pool:${NC}"
echo "# If you already have a user pool and want to add these attributes:"
echo "aws cognito-idp add-custom-attributes \\"
echo "  --user-pool-id YOUR_USER_POOL_ID \\"
echo "  --custom-attributes '{\"tenantIds\":{\"AttributeDataType\":\"String\",\"Required\":false,\"Mutable\":true,\"StringAttributeConstraints\":{\"MaxLength\":\"1000\"}},\"selectedTenantId\":{\"AttributeDataType\":\"String\",\"Required\":false,\"Mutable\":true,\"StringAttributeConstraints\":{\"MaxLength\":\"100\"}}}'"
echo ""
echo "# Or add them one by one:"
echo "aws cognito-idp add-custom-attributes \\"
echo "  --user-pool-id YOUR_USER_POOL_ID \\"
echo "  --custom-attributes '{\"tenantIds\":{\"AttributeDataType\":\"String\",\"Required\":false,\"Mutable\":true,\"StringAttributeConstraints\":{\"MaxLength\":\"1000\"}}}'"
echo ""
echo "aws cognito-idp add-custom-attributes \\"
echo "  --user-pool-id YOUR_USER_POOL_ID \\"
echo "  --custom-attributes '{\"selectedTenantId\":{\"AttributeDataType\":\"String\",\"Required\":false,\"Mutable\":true,\"StringAttributeConstraints\":{\"MaxLength\":\"100\"}}}'"
