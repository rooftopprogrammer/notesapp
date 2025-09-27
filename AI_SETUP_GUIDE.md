# 🤖 AI-Enhanced PDF Extraction Setup Guide

## Quick Start

Your family diet tracker now supports AI-powered PDF extraction for better accuracy! Here's how to set it up:

## 🌟 Recommended: Google AI Studio (Gemini)

**Best option** - Most generous free tier with excellent quality.

### Steps:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new project or select existing one
5. Generate API key
6. Add to your `.env.local` file:
```bash
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_actual_api_key_here
```

**Free Tier:** 60 requests per minute, 1,500 requests per day

---

## 🤖 Alternative: OpenAI (GPT-3.5)

High quality but limited free credits.

### Steps:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account and verify phone number
3. Go to API Keys section
4. Create new secret key
5. Add to your `.env.local` file:
```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-your_actual_api_key_here
```

**Free Tier:** $5 in credits (expires in 3 months)

---

## 🤗 Backup: Hugging Face

Good fallback option with decent free tier.

### Steps:
1. Go to [Hugging Face](https://huggingface.co/)
2. Create account
3. Go to Settings → Access Tokens
4. Create new token (read access)
5. Add to your `.env.local` file:
```bash
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_actual_api_key_here
```

**Free Tier:** 1,000 requests per month

---

## ⚡ How It Works

1. **Upload PDF** → System tries AI services in order of preference
2. **AI Extraction** → Gets structured data (meals, family, groceries)
3. **Fallback Safe** → If AI fails, uses regex extraction
4. **Smart Usage** → Tracks limits and switches services automatically

## 🎯 What Improves with AI

### Before (Regex only):
- Basic meal time detection
- Simple family member parsing
- Generic grocery extraction

### After (with AI):
- **Health Conditions**: "thyroid", "breastfeeding", "allergies"
- **Dietary Preferences**: "prefers guava", "no processed foods"
- **Smart Portions**: "1.2x for brother", "extra nutrition for wife"
- **Meal Details**: Better descriptions and timing
- **Grocery Categories**: Auto-categorizes vegetables, spices, etc.

## 📁 Complete .env.local Example

```bash
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourapp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourapp.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# Cloudinary (required for images)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset

# AI Services (optional - add any/all)
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_google_key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your_openai_key
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your_hf_key
```

## 🚀 Testing Your Setup

1. Add at least one AI API key to `.env.local`
2. Restart your development server: `npm run dev`
3. Go to [Meal Planning](http://localhost:3000/hometracker/diet/meal-planning)
4. Look for "AI-Enhanced Extraction" status indicator
5. Upload a PDF and check console logs for AI extraction

## 💡 Pro Tips

- **Start with Google Gemini** (best free tier)
- **Add multiple services** for redundancy  
- **Monitor usage** in the Settings page
- **System works fine without AI** (regex fallback)
- **Limits reset monthly** automatically

## 🔧 Troubleshooting

### "No AI services available"
- Check API keys are correctly set in `.env.local`
- Restart development server after adding keys
- Verify keys are valid (test in AI service consoles)

### "AI extraction failed"
- Don't worry! System falls back to regex automatically
- Check network connection
- Verify API key hasn't expired

### Still having issues?
- Check browser console for detailed error messages
- Test individual services in their web interfaces
- Ensure you're within free tier limits

## 🎉 Ready!

Once configured, your PDF uploads will automatically use AI for better data extraction while maintaining full backward compatibility!

Visit the [Settings page](/settings) to monitor your AI service status and usage.