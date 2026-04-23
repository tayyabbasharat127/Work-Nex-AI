# Git Push Guide - WorkNex AI

## ✅ .gitignore Files Updated

All .gitignore files have been updated to exclude sensitive and unnecessary files:

### Files Updated:
1. ✅ `.gitignore` (root) - Main project ignore rules
2. ✅ `worknex-backend/.gitignore` - Backend specific rules
3. ✅ `frontend/.gitignore` - Frontend/Next.js specific rules
4. ✅ `ai-service/.gitignore` - Python/AI service specific rules

## What's Being Ignored

### 🔒 Security & Secrets
- `.env` files (all variants)
- `*.pem`, `*.key`, `*.cert` files
- `gcp-key.json`, `service-account.json`
- Any credentials or secrets files

### 📦 Dependencies
- `node_modules/` (Node.js packages)
- `__pycache__/` (Python cache)
- `venv/`, `env/` (Python virtual environments)
- Lock files (optional, can be included if needed)

### 🏗️ Build Artifacts
- `.next/`, `out/` (Next.js builds)
- `dist/`, `build/` (compiled output)
- `*.tsbuildinfo` (TypeScript build info)

### 📝 Logs & Temporary Files
- `*.log` files
- `logs/` directory
- `tmp/`, `temp/` directories
- `*.tmp`, `*.bak` files

### 💻 IDE & OS Files
- `.vscode/`, `.idea/` (IDE settings)
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)

### 🗄️ Database
- `*.db`, `*.sqlite` files
- Database migration backups

## Before Pushing to GitHub

### Step 1: Check What Will Be Committed

```bash
# See all files that will be committed
git status

# See ignored files (should not appear in git status)
git status --ignored
```

### Step 2: Remove Already Tracked Files (if needed)

If you previously committed files that should now be ignored:

```bash
# Remove .env files from git (but keep locally)
git rm --cached .env
git rm --cached worknex-backend/.env
git rm --cached frontend/.env
git rm --cached ai-service/.env

# Remove node_modules if accidentally committed
git rm -r --cached node_modules/
git rm -r --cached worknex-backend/node_modules/
git rm -r --cached frontend/node_modules/

# Remove Python cache
git rm -r --cached ai-service/__pycache__/
git rm -r --cached worknex-backend/__pycache__/

# Remove .DS_Store files
find . -name .DS_Store -print0 | xargs -0 git rm --cached --ignore-unmatch
```

### Step 3: Create .env.example Files

Create example environment files (without sensitive data):

```bash
# Backend
cat > worknex-backend/.env.example << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/worknex"

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# TMS API (Optional)
TMS_API_URL=http://localhost:5000/tms-mock
EOF

# Frontend
cat > frontend/.env.example << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
EOF

# AI Service
cat > ai-service/.env.example << 'EOF'
DEBUG=true
HOST=0.0.0.0
PORT=8000
BACKEND_URL=http://localhost:5000/api/v1
BACKEND_TOKEN=

# AI Provider: statistical | openai | gemini
AI_PROVIDER=statistical

# Required only when AI_PROVIDER=openai
OPENAI_API_KEY=
EOF
```

## Pushing to GitHub

### Option 1: First Time Push (New Repository)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: WorkNex AI - Complete workforce management system"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/worknex-ai.git

# Push to GitHub
git push -u origin main
```

### Option 2: Push to Existing Repository

```bash
# Check current status
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Complete WorkNex AI system with fixes

- Fixed CORS issues for frontend-backend communication
- Fixed Prisma schema and database migrations
- Fixed admin dashboard empty state for new accounts
- Fixed sidebar scrolling to show all menu items
- Added comprehensive .gitignore files
- Updated all dependencies and configurations"

# Push to GitHub
git push origin main
```

### Option 3: Push Specific Changes

```bash
# Add specific files/directories
git add .gitignore
git add worknex-backend/
git add frontend/
git add ai-service/
git add docs/

# Commit
git commit -m "chore: Update .gitignore and project structure"

# Push
git push origin main
```

## Verify Before Pushing

### Check for Sensitive Data

```bash
# Search for potential secrets in staged files
git diff --cached | grep -i "password\|secret\|key\|token"

# Check for .env files
git ls-files | grep "\.env$"

# Should return nothing - if it shows .env files, they're being tracked!
```

### Check File Sizes

```bash
# Find large files (over 50MB)
find . -type f -size +50M

# GitHub has a 100MB file size limit
# Use Git LFS for large files if needed
```

## After Pushing

### Verify on GitHub

1. Go to your repository on GitHub
2. Check that:
   - ✅ No `.env` files are visible
   - ✅ No `node_modules/` directories
   - ✅ No `__pycache__/` directories
   - ✅ No sensitive credentials
   - ✅ `.env.example` files are present

### Set Up Repository Secrets (for CI/CD)

If using GitHub Actions, add secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add repository secrets:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `OPENAI_API_KEY` (if using)
   - etc.

## Common Issues & Solutions

### Issue 1: .env file still showing in git status

```bash
# Make sure .gitignore is committed first
git add .gitignore
git commit -m "Add .gitignore"

# Then remove .env from tracking
git rm --cached .env
git commit -m "Remove .env from tracking"
```

### Issue 2: node_modules still being tracked

```bash
# Remove from git but keep locally
git rm -r --cached node_modules/
git commit -m "Remove node_modules from tracking"
```

### Issue 3: Large files rejected by GitHub

```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.pdf"
git lfs track "*.zip"

# Add .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### Issue 4: Accidentally pushed secrets

```bash
# Remove from history (DANGEROUS - rewrites history)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if repository is private and you're the only user)
git push origin --force --all

# Better: Rotate the exposed secrets immediately!
```

## Recommended Commit Message Format

```bash
# Format: <type>: <subject>

# Types:
# feat: New feature
# fix: Bug fix
# docs: Documentation changes
# style: Code style changes (formatting)
# refactor: Code refactoring
# test: Adding tests
# chore: Maintenance tasks

# Examples:
git commit -m "feat: Add AI-powered leave forecasting"
git commit -m "fix: Resolve CORS issues in backend"
git commit -m "docs: Update API documentation"
git commit -m "chore: Update dependencies"
```

## Branch Strategy (Recommended)

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: Add new feature"

# Push feature branch
git push origin feature/new-feature

# Create Pull Request on GitHub
# After review, merge to main
```

## Summary Checklist

Before pushing to GitHub:

- [ ] All .gitignore files are updated
- [ ] No .env files in git status
- [ ] No node_modules/ in git status
- [ ] No sensitive credentials in code
- [ ] .env.example files created
- [ ] Large files handled with Git LFS (if any)
- [ ] Commit messages are descriptive
- [ ] Code is tested and working
- [ ] Documentation is updated

After pushing:

- [ ] Verify on GitHub - no sensitive files visible
- [ ] README.md is clear and helpful
- [ ] Repository secrets configured (if needed)
- [ ] Collaborators added (if team project)

## Quick Commands Reference

```bash
# Check status
git status

# Add all files
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main

# View ignored files
git status --ignored

# Remove file from git but keep locally
git rm --cached filename

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

---

**Ready to push!** 🚀

Your WorkNex AI project is now properly configured with comprehensive .gitignore files and is ready to be pushed to GitHub safely.
