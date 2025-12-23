# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MSP Checklist System is a dual Next.js application for AWS Managed Service Provider (MSP) partner program validation. It consists of:

1. **Main Application** (port 3010): User-facing checklist system with AI-powered advice and evidence evaluation
2. **Admin Application** (port 3011): Separate management dashboard with role-based access control

**Key Architecture Decision**: The admin system runs as a completely separate Next.js app on port 3011, NOT as a route within the main app. This separation is intentional for security and isolation.

## Development Commands

### Main Application (msp-checklist/)
```bash
# Development server
cd msp-checklist
npm run dev              # Starts on port 3010

# Production
npm run build
npm start                # Starts on port 3010

# Testing
npm run cache            # Generate/manage advice cache
npm run cache:generate   # Generate cache
npm run cache:list       # List cached items
npm run cache:stats      # Show cache statistics
```

### Admin Application (msp-checklist/admin/)
```bash
# Development server
cd msp-checklist/admin
npm run dev              # Starts on port 3011

# Production
npm run build
npm start                # Starts on port 3011
```

### Root-level Commands
```bash
# Server management scripts
./start-dev.sh           # Start both apps in development
./restart-servers.sh     # Restart both servers
./stop-servers.sh        # Stop both servers
./server-status.sh       # Check server status
./quick-restart.sh       # Quick restart with dependency check

# User management
node create-admin.cjs            # Create admin account
node create-operator.cjs         # Create operator account
node upgrade-to-superadmin.cjs   # Upgrade to superadmin

# Utilities
node file-watcher.js             # Watch for file changes
node test-admin-login.js         # Test admin authentication
```

### Deployment
```bash
# Amazon Linux 2023 deployment
./deploy/amazon-linux-2023-deploy.sh      # Full production deployment
./deploy/quick-start-amazon-linux.sh      # Quick development setup
./deploy/fix-amazon-linux-issues.sh       # Troubleshoot deployment issues
./deploy/health-check.sh                  # System health check
./deploy/backup-system.sh                 # Backup databases and configs
```

## Critical Architecture Notes

### Database Architecture (SQLite with better-sqlite3)

**IMPORTANT**: This system uses **THREE separate SQLite database files**:

1. **Main DB** (`msp-checklist/msp-assessment.db`)
   - User accounts and authentication
   - Assessment progress per user
   - Item Q&A
   - System backups metadata
   - Announcements

2. **Advice Cache DB** (`msp-checklist/advice-cache.db`)
   - Shared AI-generated advice cache
   - Language-specific (ko/en)
   - Referenced from separate cache service

3. **Virtual Evidence Cache DB** (`msp-checklist/virtual-evidence-cache.db`)
   - AI-generated virtual evidence examples
   - Language-specific (ko/en)
   - Referenced from separate cache service

**Admin App Database**: The admin app (`msp-checklist/admin/`) has its own symlink to `msp-assessment.db` located at `msp-checklist/admin/msp-assessment.db`. This is a symlink pointing to `../msp-assessment.db` to share user data.

**Database Initialization**:
- Main DB schema: [lib/db.ts:12-200](msp-checklist/lib/db.ts#L12-L200)
- Advice cache schema: [lib/advice-cache.ts](msp-checklist/lib/advice-cache.ts)
- Virtual evidence cache schema: [lib/virtual-evidence-cache.ts](msp-checklist/lib/virtual-evidence-cache.ts)

### Shared Data Between Apps

The main and admin apps share:
- User authentication data (via shared `msp-assessment.db`)
- Assessment progress data
- Advice and virtual evidence caches

They do NOT share:
- API routes (completely separate)
- Frontend components (separate component trees)
- Environment variables (separate `.env.local` files)

### Role-Based Access Control (4 Levels)

Defined in admin app at `msp-checklist/admin/lib/permissions.ts`:

1. **user**: Main app only, no admin access
2. **operator**: Limited admin access (dashboard, monitoring, announcements)
3. **admin**: Full admin access
4. **superadmin**: Full admin access with highest privileges

**Permission Guard**: Admin routes are protected by `PermissionGuard` component checking user role against required route permissions.

### AI Integration Architecture

**Multiple LLM Support**: System supports 4 LLM providers (configured in `.env.local`):
- OpenAI GPT-4
- Google Gemini
- Anthropic Claude
- AWS Bedrock

**Key Services**:
- `lib/llm-service.ts`: Unified LLM API interface
- `lib/advice-generator.ts`: Generate advice for checklist items
- `lib/virtual-evidence-generator.ts`: Generate example evidence
- `lib/advice-cache.ts`: Cache management with 24-hour TTL

**Caching Strategy**: AI responses are cached by `item_id + language` to reduce API costs and improve performance.

### Assessment Data Architecture

**Dual Language Support**: The system maintains separate data files:
- `data/assessment-data.ts`: English checklist items
- `data/assessment-data-ko.ts`: Korean checklist items
- Runtime loader: `lib/i18n-data-loader.ts`

**Assessment Types**:
- `prerequisites`: Pre-validation requirements (15 items)
- `technical`: Technical validation checklist (46 items)

**Per-User Progress**: Each user has independent progress tracked in `assessment_data` table with columns:
- `met`: 'true' | 'false' | 'null'
- `partner_response`: Text response
- `evidence_files`: JSON string of uploaded file metadata
- `evaluation_data`: JSON string of AI evaluation results

## File Watching System

Located at root `file-watcher.js`, this monitors:
- `msp_data/` directory for MSP program updates
- Automatically restarts servers on data changes
- Logs to `file-watcher.log`

**Why it exists**: MSP checklist data may be updated from external sources (Excel/PowerPoint conversions), and the system needs to reload.

## Native Module Dependency

**better-sqlite3** requires native compilation:
- Needs `make`, `gcc`, `python3` on deployment systems
- Amazon Linux 2023 specific issues: Run `./deploy/fix-amazon-linux-issues.sh` to install build tools
- If npm install fails with "make not found", install Development Tools first

## Environment Variables

**Main App** (`.env.local` in `msp-checklist/`):
```bash
# LLM Provider Selection
LLM_PROVIDER=openai  # or gemini, claude, bedrock

# API Keys (only one required based on provider)
OPENAI_API_KEY=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

**Admin App** (`.env.local` in `msp-checklist/admin/`):
```bash
# Usually minimal or none - shares main DB via symlink
```

## Server Management Scripts

All scripts are located at root level:

- **start-dev.sh**: Starts both apps in development mode concurrently
- **restart-servers.sh**: Gracefully restarts both servers with PID management
- **stop-servers.sh**: Stops both servers and cleans up PIDs
- **server-status.sh**: Shows detailed status, ports, PIDs, logs
- **quick-restart.sh**: Fast restart for development (checks dependencies first)

**PID Files**:
- `.main-server.pid`: Main app process ID
- `.admin-server.pid`: Admin app process ID

**Log Files**:
- `server.log`: Main app logs
- `admin-server.log`: Admin app logs
- `file-watcher.log`: File watcher logs

## Common Workflows

### Adding a New Checklist Item

1. Add to `data/assessment-data.ts` (English)
2. Add corresponding Korean translation to `data/assessment-data-ko.ts`
3. Database will auto-create entries when users access it
4. AI cache will generate on first advice request

### Modifying User Roles

**Via Script**:
```bash
node upgrade-to-superadmin.cjs  # Interactive role upgrade
```

**Via Admin UI**:
1. Login as admin/superadmin at http://localhost:3011
2. Navigate to Users → Select user → Change role

### Debugging AI Features

Test endpoints exist at:
- `/test-advice`: Test advice generation
- `/test-llm`: Test LLM connectivity
- `/test-db`: Test database operations

### Deployment to Amazon Linux 2023

**Full Production**:
```bash
./deploy/amazon-linux-2023-deploy.sh
# Installs: Node.js, PM2, Nginx, SSL (optional), firewall, monitoring
```

**Quick Development**:
```bash
./deploy/quick-start-amazon-linux.sh
# Minimal setup for testing
```

**Common Issues**:
- Build tools missing → `./deploy/fix-amazon-linux-issues.sh`
- Port conflicts → Check with `./server-status.sh`
- Memory issues → Set `NODE_OPTIONS="--max-old-space-size=4096"`

## Next.js Specific Notes

**App Router**: Both apps use Next.js 16+ App Router (not Pages Router)

**API Routes**:
- Main: `msp-checklist/app/api/*`
- Admin: `msp-checklist/admin/app/api/*`

**Build Output**: `.next/` directory in each app (gitignored)

**Standalone Build**: Production builds create `.next/standalone/` for deployment

## Testing

No formal test suite currently. Manual testing via:
1. Test routes: `/test-advice`, `/test-llm`, `/test-db`, `/test-pdf`
2. Health checks: `/api/health` in both apps
3. Script: `test-admin-login.js` for auth testing

See [msp-checklist/TEST_GUIDE.md](msp-checklist/TEST_GUIDE.md) for AI feature testing procedures.

## Performance Considerations

**Caching**:
- Advice cache: 24-hour TTL, shared across users
- Virtual evidence cache: Same strategy
- Cache stats: `npm run cache:stats`

**Database**:
- SQLite file-based, no separate server needed
- Foreign keys enabled
- Indexes on user_id, item_id for performance

**Build Optimization**:
- Static generation where possible
- Dynamic imports for PDF.js to reduce bundle size
- Tailwind CSS purging for smaller CSS

## Security Notes

**Authentication**:
- JWT-based with bcrypt password hashing
- Tokens stored in HTTP-only cookies
- Session validation on every admin route

**File Uploads**:
- Max 10MB per file
- Allowed: images (png, jpg, jpeg, gif) and PDF
- Stored in browser (not server-side for now)

**Admin Separation**:
- Admin on separate port (3011) prevents accidental exposure through main app
- Separate build and deployment possible

## Port Configuration

Default ports (configurable in package.json scripts):
- **Main App**: 3010 (production) / 3000 (can override with `-p` flag)
- **Admin App**: 3011

**Note**: README shows 3000 for main app, but scripts use 3010. This is intentional for production separation.

## Data Persistence

- **User Data**: SQLite `msp-assessment.db`
- **Assessment Progress**: Per-user in `assessment_data` table
- **AI Caches**: Separate SQLite DBs
- **Uploaded Files**: Currently browser-side only (localStorage/IndexedDB)

**Backup**: `./deploy/backup-system.sh` backs up all `.db` files and configs

## Multi-language Support

**Implementation**:
- Language toggle in UI switches between ko/en
- Separate data files for each language
- AI advice generated and cached per language
- User preference stored in session/localStorage

**Adding New Language**:
1. Create `data/assessment-data-{lang}.ts`
2. Update `lib/i18n-data-loader.ts`
3. Add UI translations
4. AI cache will auto-generate for new language
