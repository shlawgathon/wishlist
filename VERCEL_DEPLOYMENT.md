# Vercel Deployment Guide

This guide will help you deploy the Wishlist platform to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. All required API keys and credentials
3. MongoDB Atlas database (or your MongoDB instance)

## Step 1: Prepare Your Repository

Ensure your code is committed and pushed to GitHub, GitLab, or Bitbucket:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Next.js
4. Configure your project settings (see below)
5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add the following:

### Required Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Locus Payment Agent (Required for payments)
LOCUS_BUYER_API_KEY=locus_dev_...
LOCUS_SELLER_API_KEY=locus_dev_...

# Coinbase CDP (Optional - for wallet operations)
CDP_API_KEY_NAME=your_key_name
CDP_API_KEY_PRIVATE_KEY=your_private_key

# x402 Bazaar Endpoint
X402_BAZAAR_ENDPOINT=https://bazaar.x402.example.com

# Application URL (will be auto-set by Vercel, but you can override)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Network Configuration
NETWORK=base
BASE_RPC_URL=https://mainnet.base.org

# Authentication
AUTH_SALT=your-random-salt-string

# Voyage AI (Optional - for semantic search)
VOYAGE_API_KEY=your_voyage_api_key

# Seller Wallet Address (Optional)
SELLER_WALLET_ADDRESS=0x...
```

### Environment Variable Notes

- **MONGODB_URI**: Your MongoDB Atlas connection string
- **ANTHROPIC_API_KEY**: Get from https://console.anthropic.com/
- **LOCUS_BUYER_API_KEY**: Used for making payments (investments)
- **LOCUS_SELLER_API_KEY**: Used for receiving payments (project creators)
- **NEXT_PUBLIC_APP_URL**: Vercel will set this automatically, but you can override it
- **AUTH_SALT**: Generate a random string for password hashing

### Setting Environment Variables in Vercel

1. Go to your project dashboard
2. Navigate to **Settings → Environment Variables**
3. Add each variable for all environments (Production, Preview, Development)
4. Click **Save**

## Step 4: Configure Build Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Node.js Version**: 18.x or higher

## Step 5: Deploy

1. After setting environment variables, trigger a new deployment:
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger automatic deployment

2. Wait for the build to complete

3. Visit your deployment URL (e.g., `https://your-app.vercel.app`)

## Step 6: Post-Deployment Setup

### 1. Verify MongoDB Connection

- Check that your MongoDB Atlas IP whitelist includes Vercel's IP ranges (or allow all IPs for testing)
- Verify your database connection string is correct

### 2. Test Key Features

- ✅ User signup/login
- ✅ Create a project/listing
- ✅ AI search functionality
- ✅ Investment execution
- ✅ x402 service discovery

### 3. Configure Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct build scripts
- Check TypeScript errors locally with `npm run build`

### Runtime Errors

- Check function logs in Vercel dashboard
- Verify MongoDB connection string
- Ensure API keys are valid
- Check network requests in browser console

### Environment Variables Not Working

- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### MongoDB Connection Issues

- Verify IP whitelist in MongoDB Atlas
- Check connection string format
- Ensure database user has correct permissions

## Monitoring

- **Analytics**: Enable Vercel Analytics in project settings
- **Logs**: View function logs in Vercel dashboard
- **Performance**: Monitor in Vercel dashboard → Analytics

## Continuous Deployment

Vercel automatically deploys on every push to your main branch. For other branches, preview deployments are created automatically.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues:
1. Check Vercel build logs
2. Review environment variable configuration
3. Test locally with the same environment variables
4. Check Vercel status page: https://vercel-status.com

