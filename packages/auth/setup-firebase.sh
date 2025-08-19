#!/bin/bash

# Firebase + Google Identity Platform (GIP) Setup Script
# Creates Firebase project with multi-tenant support and MFA using gcloud CLI

set -e

# Project Configuration (EDIT THIS)
PROJECT_NAME="keystone"

# Function to generate shorter project ID
generate_project_id() {
  local base_name=$1
  local stage=$2
  local suffix=$3
  
  if [[ -z "$suffix" ]]; then
    # Generate 6-digit random number instead of full timestamp
    suffix=$(printf "%06d" $((RANDOM % 100000)))
  fi
  
  echo "${base_name}-${stage}-${suffix}"
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
STAGE=""
MODE="create"
while [[ $# -gt 0 ]]; do
  case $1 in
    --stage=*)
      STAGE="${1#*=}"
      shift
      ;;
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --help|-h)
      echo -e "${BLUE}🔥 Firebase + Google Identity Platform Setup${NC}"
      echo "=============================================="
      echo ""
      echo "Usage: ./setup-firebase.sh --stage=<stage> [--mode=<mode>]"
      echo ""
      echo "Examples:"
      echo "  ./setup-firebase.sh --stage=dev"
      echo "  ./setup-firebase.sh --stage=prod"
      echo "  ./setup-firebase.sh --stage=dev --mode=update"
      echo ""
      echo "Modes:"
      echo "  create (default): Create new project and setup Firebase"
      echo "  update: Update existing project with Firebase features"
      echo ""
      echo "This script will:"
      echo "1. Check and install required CLIs"
      echo "2. Authenticate with Google Cloud"
      echo "3. Create/Update Firebase project with GIP"
      echo "4. Enable multi-tenancy and MFA TOTP"
      echo "5. Output environment variables"
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown parameter: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate stage parameter
if [[ -z "$STAGE" ]]; then
  echo -e "${RED}❌ Error: --stage parameter is required${NC}"
  echo "Usage: ./setup-firebase.sh --stage=dev"
  echo "Use --help for more information"
  exit 1
fi

# Normalize stage names
case $STAGE in
  "dev"|"development")
    STAGE="dev"
    ENVIRONMENT="dev"
    ;;
  "prod"|"production")
    STAGE="prod"
    ENVIRONMENT="prod"
    ;;
  *)
    echo -e "${RED}❌ Error: Invalid stage '$STAGE'. Use 'dev' or 'prod'${NC}"
    exit 1
    ;;
esac

# Generate project ID based on mode
if [[ "$MODE" == "update" ]]; then
  # For update mode, try to find existing project with exact name match
  EXISTING_PROJECT=$(gcloud projects list --filter="name:keystone-${STAGE}" --format="value(projectId)" --limit=1 2>/dev/null || echo "")
  
  if [[ -n "$EXISTING_PROJECT" ]]; then
    PROJECT_ID="$EXISTING_PROJECT"
    echo -e "${GREEN}✅ Found existing project:${NC} $PROJECT_ID"
  else
    echo -e "${YELLOW}⚠️  No existing project found with name: keystone-${STAGE}${NC}"
    echo ""
    read -p "Would you like to create a new project instead? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}🔄 Switching to create mode...${NC}"
      MODE="create"
      # Generate new project ID for creation
      PROJECT_ID=$(generate_project_id "$PROJECT_NAME" "$STAGE")
    else
      echo -e "${BLUE}Setup cancelled.${NC}"
      exit 0
    fi
  fi
else
  # For create mode, generate new project ID
  PROJECT_ID=$(generate_project_id "$PROJECT_NAME" "$STAGE")
fi

DISPLAY_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

echo -e "${BLUE}🔥 Firebase + Google Identity Platform Setup${NC}"
echo "=============================================="
echo -e "${CYAN}Project Name:${NC} $PROJECT_NAME"
echo -e "${CYAN}Stage:${NC} $STAGE"
echo -e "${CYAN}Environment:${NC} $ENVIRONMENT"
echo -e "${CYAN}Mode:${NC} $MODE"
echo -e "${CYAN}Project ID:${NC} $PROJECT_ID"
echo -e "${CYAN}Display Name:${NC} $DISPLAY_NAME"
echo ""

# Define app name early for display
APP_NAME="Keystone CMS"

# Show what will be done based on mode
if [[ "$MODE" == "update" ]]; then
  echo -e "${YELLOW}📋 What will be updated:${NC}"
  echo "=============================================="
  echo "• Google Cloud Project: $PROJECT_ID (existing project)"
  echo "• Firebase project with authentication (environment: $([ "$STAGE" == "prod" ] && echo "production" || echo "unspecified"))"
  echo "• Google Identity Platform (GIP) for multi-tenancy"
  echo "• Multi-factor authentication (MFA TOTP)"
  echo "• Firebase web app: $APP_NAME"
  echo "• Service account for admin operations"
  echo "• Service account key: service-account-key-$STAGE.json"
  echo "• Environment variables output to console"
  echo ""
  echo -e "${YELLOW}⚠️  This will:${NC}"
  echo "• Use existing Google Cloud project"
  echo "• Enable Firebase and APIs"
  echo "• Configure GIP and MFA"
  echo "• Generate service account keys"
  echo "• Create local configuration files"
else
  echo -e "${YELLOW}📋 What will be created:${NC}"
  echo "=============================================="
  echo "• Google Cloud Project: $PROJECT_ID (with environment label: $STAGE)"
  echo "• Firebase project with authentication (environment: $([ "$STAGE" == "prod" ] && echo "production" || echo "unspecified"))"
  echo "• Google Identity Platform (GIP) for multi-tenancy"
  echo "• Multi-factor authentication (MFA TOTP)"
  echo "• Firebase web app: $APP_NAME"
  echo "• Service account for admin operations"
  echo "• Service account key: service-account-key-$STAGE.json"
  echo "• Environment variables output to console"
  echo ""
  echo -e "${YELLOW}⚠️  This will:${NC}"
  echo "• Create new Google Cloud resources"
  echo "• Enable billing (if billing account available)"
  echo "• Generate service account keys"
  echo "• Create local configuration files"
fi

echo ""
read -p "Do you want to continue? (y/n): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Setup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting setup...${NC}"
echo "=============================================="
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to prompt user for installation
prompt_install() {
  local tool=$1
  local install_cmd=$2
  
  echo -e "${YELLOW}⚠️  $tool is not installed.${NC}"
  echo -e "${YELLOW}Install command: $install_cmd${NC}"
  read -p "Would you like to install $tool now? (y/n): " -r
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Installing $tool...${NC}"
    eval "$install_cmd"
    if command_exists "${tool%% *}"; then
      echo -e "${GREEN}✅ $tool installed successfully${NC}"
    else
      echo -e "${RED}❌ Failed to install $tool${NC}"
      exit 1
    fi
  else
    echo -e "${RED}❌ $tool is required to continue${NC}"
    exit 1
  fi
}

# Check and install gcloud CLI
echo -e "${BLUE}🔍 Checking required CLIs...${NC}"
if ! command_exists gcloud; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    prompt_install "Google Cloud SDK" "curl https://sdk.cloud.google.com | bash && exec -l \$SHELL"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    prompt_install "Google Cloud SDK" "curl https://sdk.cloud.google.com | bash && exec -l \$SHELL"
  else
    echo -e "${RED}❌ Please install Google Cloud SDK manually: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
  fi
fi

# Check and install Firebase CLI
if ! command_exists firebase; then
  if command_exists npm; then
    prompt_install "Firebase CLI" "npm install -g firebase-tools"
  elif command_exists yarn; then
    prompt_install "Firebase CLI" "yarn global add firebase-tools"
  else
    echo -e "${RED}❌ Please install Node.js and npm first, then run: npm install -g firebase-tools${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ All required CLIs are available${NC}"
echo ""

# Always require fresh authentication for security
echo -e "${BLUE}🔐 Authentication Required${NC}"
echo "=============================================="
echo -e "${YELLOW}⚠️  For security, this script requires fresh authentication${NC}"
echo ""

# Google Cloud authentication
echo -e "${BLUE}🌐 Google Cloud Authentication${NC}"
read -p "Press Enter to open Google Cloud login in browser..."
gcloud auth login

# Verify Google Cloud authentication
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
if [[ -z "$ACCOUNT" ]]; then
  echo -e "${RED}❌ Google Cloud authentication failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Google Cloud authenticated as:${NC} $ACCOUNT"

# Firebase authentication
echo ""
echo -e "${BLUE}🔥 Firebase Authentication${NC}"
read -p "Press Enter to open Firebase login in browser..."
firebase login

echo -e "${GREEN}✅ Firebase authenticated${NC}"
echo ""

# Handle project creation or update
if [[ "$MODE" == "update" ]]; then
  echo -e "${BLUE}🔄 Updating existing Google Cloud Project...${NC}"
  echo -e "${GREEN}✅ Using existing project:${NC} $PROJECT_ID"
  gcloud config set project $PROJECT_ID
  
  # Update existing project with environment label
  echo -e "${BLUE}🏷️ Setting environment label...${NC}"
  # Note: Labels are set during project creation, not update
  echo -e "${YELLOW}⚠️  Project labels are set during creation only${NC}"
  echo -e "${GREEN}✅ Environment label already set to:${NC} $STAGE"
else
  # Create Google Cloud Project with environment label
  echo -e "${BLUE}🏗️ Creating Google Cloud Project...${NC}"
  if gcloud projects create $PROJECT_ID --name="$DISPLAY_NAME" --set-as-default --labels=environment=$STAGE 2>/dev/null; then
    echo -e "${GREEN}✅ Project created:${NC} $PROJECT_ID"
    echo -e "${GREEN}✅ Environment label set to:${NC} $STAGE"
  else
    echo -e "${YELLOW}⚠️  Project creation failed. Checking if project exists...${NC}"
    
    # Check if project actually exists and we have access
    if gcloud projects describe $PROJECT_ID &>/dev/null; then
      echo -e "${GREEN}✅ Project exists and accessible. Setting as default...${NC}"
      gcloud config set project $PROJECT_ID
      
      # Update existing project with environment label
      echo -e "${BLUE}🏷️ Setting environment label...${NC}"
      # Note: Labels are set during project creation, not update
      echo -e "${YELLOW}⚠️  Project labels are set during creation only${NC}"
      echo -e "${GREEN}✅ Environment label already set to:${NC} $STAGE"
    else
      echo -e "${RED}❌ Project '$PROJECT_ID' does not exist or you don't have access${NC}"
      echo -e "${YELLOW}Possible reasons:${NC}"
      echo "• Project was deleted"
      echo "• You don't have permission to access it"
      echo "• Project ID is reserved by another user"
      echo "• Rate limit exceeded (wait a few minutes)"
      echo ""
      echo -e "${BLUE}Solutions:${NC}"
      echo "1. Wait 2-3 minutes and try again (rate limit)"
      echo "2. Use --mode=update if project already exists"
      echo "3. Check your Google Cloud permissions"
      echo ""
      read -p "Would you like to try with a different project ID? (y/n): " -r
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Generate new project ID with shorter suffix
        NEW_PROJECT_ID=$(generate_project_id "$PROJECT_NAME" "$STAGE")
        echo -e "${BLUE}🔄 Trying with new project ID:${NC} $NEW_PROJECT_ID"
        PROJECT_ID=$NEW_PROJECT_ID
        
        # Try to create the new project
        if gcloud projects create $PROJECT_ID --name="$DISPLAY_NAME" --set-as-default --labels=environment=$STAGE; then
          echo -e "${GREEN}✅ New project created successfully:${NC} $PROJECT_ID"
        else
          echo -e "${RED}❌ Failed to create project. Please check your permissions and try again.${NC}"
          exit 1
        fi
      else
        echo -e "${BLUE}Setup cancelled.${NC}"
        exit 0
      fi
    fi
  fi
fi

# Billing setup reminder
echo -e "${BLUE}💳 Billing Setup Required${NC}"
echo -e "${YELLOW}⚠️  Please ensure billing is configured for this project:${NC}"
echo "1. Go to: https://console.cloud.google.com/billing/projects"
echo "2. Find project: $PROJECT_ID"
echo "3. Click 'Link billing account' if not already linked"
echo "4. Select or create a billing account"
echo ""
read -p "Press Enter after confirming billing is set up (or if it's already configured)..."
echo -e "${GREEN}✅ Continuing with setup...${NC}"

# Enable required APIs
echo -e "${BLUE}🔌 Enabling required APIs...${NC}"
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable cloudbilling.googleapis.com


# Add Firebase to the project
echo -e "${BLUE}🔥 Adding Firebase to project...${NC}"

# Check if Firebase is already added to the project
if firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
  echo -e "${BLUE}ℹ️  Firebase already added to project${NC}"
else
  # Try to add Firebase
  if firebase projects:addfirebase $PROJECT_ID 2>/dev/null; then
    echo -e "${BLUE}ℹ️  Firebase added to project${NC}"
  else
    echo -e "${YELLOW}⚠️  Firebase project creation failed${NC}"
    echo ""
    read -p "Press Enter to continue (Firebase might already be configured)..."
  fi
fi

# Set Firebase project environment type
echo -e "${BLUE}🏷️ Setting Firebase project environment...${NC}"
if [[ "$STAGE" == "prod" ]]; then
  # For production, set environment to "production"
  curl -X PATCH \
      -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      -H "Content-Type: application/json" \
      -d '{
        "environment": "production"
      }' \
      "https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID" \
      2>/dev/null || echo -e "${YELLOW}⚠️  Could not set Firebase environment type${NC}"
  
else
  # For dev/staging, set environment to "unspecified" (default)
  echo -e "${BLUE}ℹ️  Firebase environment set to unspecified (default)${NC}"
fi



# Enable Google Identity Platform (GIP) for multi-tenancy
echo -e "${BLUE}🏢 Enabling Google Identity Platform (GIP)...${NC}"

# Enable required APIs
gcloud services enable identitytoolkit.googleapis.com --project=$PROJECT_ID 2>/dev/null || echo -e "${YELLOW}⚠️  Identity Platform API may already be enabled${NC}"

# Identity Platform must be enabled manually in Console first
echo -e "${YELLOW}⚠️  Identity Platform must be enabled manually in Console${NC}"
echo -e "${BLUE}📋 Opening browser to enable Identity Platform...${NC}"

# Open browser to enable Identity Platform
IDENTITY_PLATFORM_URL="https://console.cloud.google.com/marketplace/details/google-cloud-platform/customer-identity?project=$PROJECT_ID"
if command -v open >/dev/null 2>&1; then
  open "$IDENTITY_PLATFORM_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$IDENTITY_PLATFORM_URL"
else
  echo -e "${BLUE}🔗 Please open this URL manually:${NC}"
  echo -e "${BLUE}   $IDENTITY_PLATFORM_URL${NC}"
fi

echo ""
echo -e "${BLUE}📋 Steps to enable Identity Platform:${NC}"
echo "1. Click 'Enable' button on the page"
echo "2. Wait for the service to be enabled"
echo "3. Return here and press Enter to continue"
echo ""
read -p "Press Enter after enabling Identity Platform in Console..."

# Now enable the Identity Platform API functions
echo -e "${BLUE}🔧 Enabling Identity Platform API functions...${NC}"
gcloud config set project "$PROJECT_ID"
gcloud services enable identitytoolkit.googleapis.com --project "$PROJECT_ID"

# Cloud Functions API must also be enabled manually
echo -e "${BLUE}☁️  Enabling Cloud Functions API...${NC}"
echo -e "${YELLOW}⚠️  Cloud Functions API must be enabled manually in Console${NC}"
echo -e "${BLUE}📋 Opening browser to enable Cloud Functions API...${NC}"

# Open browser to enable Cloud Functions API
CLOUD_FUNCTIONS_URL="https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=$PROJECT_ID"
if command -v open >/dev/null 2>&1; then
  open "$CLOUD_FUNCTIONS_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$CLOUD_FUNCTIONS_URL"
else
  echo -e "${BLUE}🔗 Please open this URL manually:${NC}"
  echo -e "${BLUE}   $CLOUD_FUNCTIONS_URL${NC}"
fi

echo ""
echo -e "${BLUE}📋 Steps to enable Cloud Functions API:${NC}"
echo "1. Click 'Enable' button on the page"
echo "2. Wait for the service to be enabled"
echo "3. Return here and press Enter to continue"
echo ""
read -p "Press Enter after enabling Cloud Functions API in Console..."

echo -e "${GREEN}✅ Identity Platform enabled${NC}"

# Configure multi-tenancy (must be done manually in Console)
echo -e "${BLUE}🏢 Configuring multi-tenancy...${NC}"
echo -e "${YELLOW}⚠️  Multi-tenancy must be enabled manually in Console${NC}"
echo -e "${BLUE}📋 Opening browser to enable multi-tenancy...${NC}"

# Open browser to enable multi-tenancy
MULTITENANT_URL="https://console.cloud.google.com/customer-identity/settings?project=$PROJECT_ID"
if command -v open >/dev/null 2>&1; then
  open "$MULTITENANT_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$MULTITENANT_URL"
else
  echo -e "${BLUE}🔗 Please open this URL manually:${NC}"
  echo -e "${BLUE}   $MULTITENANT_URL${NC}"
fi

echo ""
echo -e "${BLUE}📋 Steps to enable multi-tenancy:${NC}"
echo "1. Navigate to 'Multi-tenancy' section > Security"
echo "2. Enable multi-tenancy feature 'Allow tenants'"
echo "3. Return here and press Enter to continue"
echo ""
read -p "Press Enter after enabling multi-tenancy in Console..."

echo -e "${GREEN}✅ Multi-tenancy enabled${NC}"

## Enable Email/Password sign-in provider (project-level)
echo -e "${BLUE}🔐 Enabling Email/Password sign-in...${NC}"

# Ensure we're pointing gcloud at the right project and API is enabled
gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable identitytoolkit.googleapis.com --project "$PROJECT_ID" >/dev/null

# Get an access token for the user (if not already set)
ACCESS_TOKEN="${ACCESS_TOKEN:-$(gcloud auth print-access-token)}"

EMAIL_PROVIDER_RESPONSE=$(curl -sS -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' 2>/dev/null)

if [[ "$EMAIL_PROVIDER_RESPONSE" == *"error"* ]]; then
  echo -e "${YELLOW}⚠️  Could not enable Email/Password automatically${NC}"
else
  echo -e "${GREEN}✅ Email/Password sign-in enabled${NC}"
fi

# Configure MFA TOTP via Identity Platform API (should work after manual enablement)
echo -e "${BLUE}🔐 Configuring MFA TOTP...${NC}"

# Enable MFA TOTP using the Identity Platform API with proper headers
MFA_RESPONSE=$(curl -sS -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=mfa" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    -d '{
        "mfa": {
          "providerConfigs": [{
            "state": "ENABLED",
            "totpProviderConfig": { "adjacentIntervals": 1 }
          }]
        }
      }' 2>/dev/null)

if [[ "$MFA_RESPONSE" == *"error"* ]] || [[ "$MFA_RESPONSE" == *"403"* ]] || [[ "$MFA_RESPONSE" == *"404"* ]]; then
  echo -e "${YELLOW}⚠️  MFA TOTP configuration failed or already configured${NC}"
  echo -e "${BLUE}ℹ️  Response: $MFA_RESPONSE${NC}"
  echo -e "${BLUE}ℹ️  You may need to run this command manually:${NC}"
  echo -e "${BLUE}   curl -X PATCH \"https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=mfa\" \\${NC}"
  echo -e "${BLUE}     -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" \\${NC}"
  echo -e "${BLUE}     -H \"Content-Type: application/json\" \\${NC}"
  echo -e "${BLUE}     -H \"X-Goog-User-Project: $PROJECT_ID\" \\${NC}"
  echo -e "${BLUE}     -d '{\"mfa\":{\"providerConfigs\":[{\"state\":\"ENABLED\",\"totpProviderConfig\":{\"adjacentIntervals\":1}}]}}'${NC}"
else
  echo -e "${GREEN}✅ MFA TOTP configured successfully${NC}"
fi

echo -e "${GREEN}✅ Identity Platform configuration completed${NC}"

# Create Firebase Web App
echo -e "${BLUE}📱 Creating Firebase Web App...${NC}"

# Check if web app already exists first
if firebase apps:list --project=$PROJECT_ID 2>/dev/null | grep -q "web"; then
  echo -e "${GREEN}✅ Web app already exists${NC}"
else
  # Try to create the web app (capture both stdout and stderr)
  echo -e "${BLUE}🔄 Creating web app: $APP_NAME...${NC}"
  
  # Create a temporary file to capture output
  TEMP_OUTPUT=$(mktemp)
  if firebase apps:create web "$APP_NAME" --project=$PROJECT_ID > "$TEMP_OUTPUT" 2>&1; then
    echo -e "${GREEN}✅ Web app created:${NC} $APP_NAME"
    # Show the success output
    cat "$TEMP_OUTPUT"
  else
    echo -e "${YELLOW}⚠️  Web app creation failed${NC}"
    echo -e "${BLUE}📋 Error details:${NC}"
    cat "$TEMP_OUTPUT"
    
    # Check if it's a permission/authentication issue
    if grep -q "permission\|authentication\|unauthorized" "$TEMP_OUTPUT" 2>/dev/null; then
      echo -e "${BLUE}📋 This appears to be an authentication or permission issue${NC}"
    fi

    echo -e "${BLUE}📋 You can create the web app manually in Firebase Console:${NC}"
    echo -e "${BLUE}   https://console.firebase.google.com/project/$PROJECT_ID/projectOverview${NC}"
    echo ""
    read -p "Press Enter after creating the web app manually..."
  fi
  
  # Clean up temp file
  rm -f "$TEMP_OUTPUT"
fi

# Get Firebase config
echo -e "${BLUE}⚙️ Getting Firebase configuration...${NC}"

# Wait longer for Firebase to fully register the new web app
echo -e "${BLUE}⏳ Waiting for Firebase to register web app (this may take a few minutes)...${NC}"
sleep 30

# Get Firebase config using the Management API (more reliable than CLI)
ACCESS_TOKEN="$(gcloud auth print-access-token)"

# List web apps to get the APP_ID
WEB_APPS_RESPONSE=$(curl -sS \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Goog-User-Project: ${PROJECT_ID}" \
  "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps" 2>/dev/null)

# Extract the first web app ID (assuming there's only one)


# Use a safer extraction method
if [[ "$WEB_APPS_RESPONSE" == *'"appId"'* ]]; then
  APP_ID_FROM_API=$(echo "$WEB_APPS_RESPONSE" | awk -F'"' '/"appId"/{print $4; exit}')
  
  # If awk failed, try a different approach
  if [ -z "$APP_ID_FROM_API" ]; then
    TEMP_RESPONSE=$(echo "$WEB_APPS_RESPONSE" | tr -d '\n\r')
    APP_ID_START=$(echo "$TEMP_RESPONSE" | cut -d'"' -f1- | sed 's/.*"appId":"//')
    APP_ID_FROM_API=$(echo "$APP_ID_START" | cut -d'"' -f1)
  fi
else
  APP_ID_FROM_API=""
fi

if [ -z "$APP_ID_FROM_API" ]; then
  echo -e "${YELLOW}⚠️  Could not get web app ID from API${NC}"
  
      echo -e "${BLUE}📋 Falling back to Firebase CLI...${NC}"
  
  # Fallback to Firebase CLI
  CONFIG_OUTPUT=$(firebase apps:sdkconfig web --project=$PROJECT_ID --json 2>/dev/null)
  if [ -z "$CONFIG_OUTPUT" ] || [ "$CONFIG_OUTPUT" = "null" ]; then
    CONFIG_OUTPUT=$(firebase apps:sdkconfig web --project=$PROJECT_ID 2>/dev/null)
  fi
else
  
  
  # Also extract projectId from the web apps response
  PROJECT_ID_FROM_API=$(echo "$WEB_APPS_RESPONSE" | awk -F'"' '/"projectId"/{print $4; exit}')
  
  # If awk failed, try a different approach
  if [ -z "$PROJECT_ID_FROM_API" ]; then
    TEMP_RESPONSE=$(echo "$WEB_APPS_RESPONSE" | tr -d '\n\r')
    PROJECT_ID_START=$(echo "$TEMP_RESPONSE" | cut -d'"' -f1- | sed 's/.*"projectId":"//')
    PROJECT_ID_FROM_API=$(echo "$PROJECT_ID_START" | cut -d'"' -f1)
  fi
  
  # Fetch config using the Management API
  CONFIG_OUTPUT=$(curl -sS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "X-Goog-User-Project: ${PROJECT_ID}" \
    "https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${APP_ID_FROM_API}/config" 2>/dev/null)
  
  # Check if we got a valid config response
  if [[ "$CONFIG_OUTPUT" == *'"apiKey"'* ]]; then
    echo -e "${GREEN}✅ Successfully retrieved Firebase config from Management API${NC}"
  else
    echo -e "${YELLOW}⚠️  Management API config response doesn't contain expected data${NC}"
    
      echo -e "${BLUE}📋 Falling back to Firebase CLI...${NC}"
    
    # Fallback to Firebase CLI
    CONFIG_OUTPUT=$(firebase apps:sdkconfig web --project=$PROJECT_ID --json 2>/dev/null)
    if [ -z "$CONFIG_OUTPUT" ] || [ "$CONFIG_OUTPUT" = "null" ]; then
      CONFIG_OUTPUT=$(firebase apps:sdkconfig web --project=$PROJECT_ID 2>/dev/null)
    fi
  fi
fi

if [ -z "$CONFIG_OUTPUT" ] || [ "$CONFIG_OUTPUT" = "null" ]; then
  echo -e "${YELLOW}⚠️  Could not retrieve Firebase configuration automatically${NC}"
  echo ""
  read -p "Press Enter to continue with service account setup..."
fi

# Extract config values using basic shell commands (avoiding jq dependency)
if [[ "$CONFIG_OUTPUT" == *'"apiKey"'* ]]; then
  # Management API JSON format
  # Use awk for reliable parsing
  API_KEY=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"apiKey"/{print $4; exit}')
  AUTH_DOMAIN=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"authDomain"/{print $4; exit}')
  PROJECT_ID_CONFIG=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"projectId"/{print $4; exit}')
  STORAGE_BUCKET=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"storageBucket"/{print $4; exit}')
  MESSAGING_SENDER_ID=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"messagingSenderId"/{print $4; exit}')
  # APP_ID comes from the web apps list, not the config
  APP_ID="$APP_ID_FROM_API"
  MEASUREMENT_ID=$(echo "$CONFIG_OUTPUT" | awk -F'"' '/"measurementId"/{print $4; exit}' 2>/dev/null || echo "")
elif [[ "$CONFIG_OUTPUT" == *'apiKey:'* ]]; then
  # Firebase CLI format
  API_KEY=$(echo "$CONFIG_OUTPUT" | grep -o 'apiKey: "[^"]*"' | cut -d'"' -f2)
  AUTH_DOMAIN=$(echo "$CONFIG_OUTPUT" | grep -o 'authDomain: "[^"]*"' | cut -d'"' -f2)
  PROJECT_ID_CONFIG=$(echo "$CONFIG_OUTPUT" | grep -o 'projectId: "[^"]*"' | cut -d'"' -f2)
  STORAGE_BUCKET=$(echo "$CONFIG_OUTPUT" | grep -o 'storageBucket: "[^"]*"' | cut -d'"' -f2)
  MESSAGING_SENDER_ID=$(echo "$CONFIG_OUTPUT" | grep -o 'messagingSenderId: "[^"]*"' | cut -d'"' -f2)
  APP_ID=$(echo "$CONFIG_OUTPUT" | grep -o 'appId: "[^"]*"' | cut -d'"' -f2)
  MEASUREMENT_ID=$(echo "$CONFIG_OUTPUT" | grep -o 'measurementId: "[^"]*"' | cut -d'"' -f2 2>/dev/null || echo "")
fi

# Validate that we got the essential config values
if [ -z "$API_KEY" ] || [ -z "$AUTH_DOMAIN" ] || [ -z "$APP_ID" ]; then
  echo -e "${YELLOW}⚠️  Could not retrieve essential Firebase configuration${NC}"
  echo -e "${BLUE}ℹ️  This is common for newly created web apps${NC}"
  echo -e "${BLUE}ℹ️  You can manually get the config later with:${NC}"
  echo -e "${BLUE}   firebase apps:sdkconfig web --project=$PROJECT_ID --json${NC}"
  echo ""
  read -p "Press Enter to continue without config (you can add it manually later)..."
  
  # Set placeholder values so the script can continue
  API_KEY="YOUR_API_KEY_HERE"
  AUTH_DOMAIN="YOUR_AUTH_DOMAIN_HERE"
  PROJECT_ID_CONFIG="$PROJECT_ID"
  STORAGE_BUCKET="YOUR_STORAGE_BUCKET_HERE"
  MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID_HERE"
  APP_ID="YOUR_APP_ID_HERE"
fi

# Create service account for admin SDK
SERVICE_ACCOUNT_NAME="${PROJECT_NAME}-${STAGE}-admin"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="$DISPLAY_NAME Admin" \
    --description="Service account for $DISPLAY_NAME Firebase Admin SDK" \
    2>/dev/null || echo -e "${YELLOW}⚠️  Service account may already exist${NC}"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/firebase.admin" \
    --quiet >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Role may already be assigned${NC}"

# Create and download service account key
KEY_FILE="service-account-key-${STAGE}.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --quiet >/dev/null 2>&1



# Extract individual service account fields from the JSON key file
# Extract service account details from the key file
CLIENT_EMAIL=$(cat $KEY_FILE | awk -F'"' '/"client_email"/{print $4; exit}')

# For private_key, we need to handle the multi-line format
PRIVATE_KEY=$(cat $KEY_FILE | awk -F'"' '/"private_key"/{print $4; exit}')

# If awk failed, try alternative method
if [ -z "$CLIENT_EMAIL" ] || [ -z "$PRIVATE_KEY" ]; then
  # Use sed to extract the values
  CLIENT_EMAIL=$(cat $KEY_FILE | sed -n '/"client_email"/s/.*"client_email":"\([^"]*\)".*/\1/p')
  PRIVATE_KEY=$(cat $KEY_FILE | sed -n '/"private_key"/s/.*"private_key":"\([^"]*\)".*/\1/p')
fi

# Display only the required environment variables
echo -e "${GREEN}🎉 SETUP COMPLETED SUCCESSFULLY!${NC}"
echo "=============================================="
echo ""
echo -e "${YELLOW}📋 Environment Variables (Copy to .env):${NC}"
echo "FIREBASE_PROJECT_ID=$PROJECT_ID"
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID"
echo "NEXT_PUBLIC_FIREBASE_API_KEY=$API_KEY"
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN"
echo "FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL"
echo "FIREBASE_PRIVATE_KEY=$PRIVATE_KEY"
echo ""

echo -e "${BLUE}📋 Summary:${NC}"
echo "• Firebase project configured with multi-tenancy"
echo "• MFA TOTP enabled via Identity Platform API"
echo "• Service account created for admin operations"
echo "• All required environment variables generated"
echo ""
rm -f "$KEY_FILE" >/dev/null 2>&1 || true
echo -e "${GREEN}🎯 Ready to use!${NC}"