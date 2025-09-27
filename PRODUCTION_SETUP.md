# Production Setup Guide 🚀

This guide explains how to set up your app for production deployment with image upload functionality.

## 🚨 Current Issue: Image Uploads Failing in Production

Your app is deployed as a static site, but the Cloudinary environment variables are not available in production. Follow these steps to fix it:

## ✅ Step 1: Set up GitHub Repository Secrets

You need to add your Cloudinary credentials as GitHub secrets so they're available during the build process.

### Go to GitHub Repository Settings:
1. Go to your GitHub repository: `https://github.com/rooftopprogrammer/notesapp`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Add These Secrets:

#### Secret 1: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Name**: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- **Value**: `dup5wti80` (from your .env.local)

#### Secret 2: `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- **Name**: `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- **Value**: `home_inventory_upload` (from your .env.local)

## ✅ Step 2: Verify Your Cloudinary Upload Preset

Make sure your Cloudinary upload preset is configured correctly:

1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Navigate to **Settings** → **Upload**
3. Find your upload preset: `home_inventory_upload`
4. Ensure it's set to **Unsigned** (this is important for client-side uploads)
5. Check that the folder is set to `home-inventory` or leave empty

## ✅ Step 3: Redeploy Your App

After adding the GitHub secrets:

1. Make a small change to your code (or just push an empty commit)
2. Push to the `master` branch:
   ```bash
   git add .
   git commit -m "Add Cloudinary environment variables for production"
   git push origin master
   ```
3. GitHub Actions will automatically rebuild and redeploy with the environment variables

## ✅ Step 4: Verify Production Deployment

1. Wait for the GitHub Actions deployment to complete
2. Visit your live site: https://notesapp-89d19.web.app
3. Go to Home Tracker → Inventory
4. Try adding a new item with images
5. Check the browser console for debug logs

## 🐛 Debugging

If image uploads still fail, check the browser console for these debug logs:

```
🔍 Cloudinary Environment Check: {
  cloudName: "dup***", 
  uploadPreset: "hom***",
  environment: "production"
}
```

If you see `MISSING` values, the GitHub secrets weren't set correctly.

## 📁 Current Environment Variables

### Development (.env.local):
```bash
# ✅ These work in development
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dup5wti80
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=home_inventory_upload
```

### Production (GitHub Secrets):
```bash
# ✅ Add these as GitHub repository secrets
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dup5wti80
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=home_inventory_upload
```

## 🔄 Automatic Deployment Process

Your app uses GitHub Actions for deployment:

1. **Push to master** → Triggers production deployment
2. **GitHub Actions builds** with environment variables from secrets
3. **Static files generated** with Cloudinary config embedded
4. **Deployed to Firebase Hosting** → https://notesapp-89d19.web.app

## ❓ Troubleshooting

### Problem: "Cloudinary configuration missing" error
**Solution**: Add GitHub repository secrets as described in Step 1

### Problem: Upload fails with 401/403 error
**Solution**: Check that your Cloudinary upload preset is set to "Unsigned"

### Problem: Images upload but don't display
**Solution**: Check CORS settings in Cloudinary (usually not needed for unsigned uploads)

---

## 🎯 Next Steps

After completing these steps, your production app will have the same image upload functionality as your development environment.

**Test checklist:**
- [ ] GitHub secrets added
- [ ] Code pushed to master
- [ ] GitHub Actions deployment completed
- [ ] Production site accessible
- [ ] Image uploads working
- [ ] Images display correctly in cards and detail views