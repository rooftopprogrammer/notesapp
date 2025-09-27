# AI API Configuration for PDF Extraction

This document explains how to set up free AI APIs for enhanced PDF data extraction in your family diet tracker.

## Supported Free AI Services

### 1. OpenAI (Recommended)
- **Free Tier**: $5 in free credits (3-month expiry)
- **Models**: GPT-3.5-turbo (most cost-effective)
- **Setup**:
  1. Visit https://platform.openai.com/
  2. Create account and verify phone number
  3. Go to API Keys section
  4. Create new API key
  5. Add to `.env.local`: `NEXT_PUBLIC_OPENAI_API_KEY=your_key_here`

### 2. Google AI Studio (Gemini) - Best Free Option
- **Free Tier**: 60 requests per minute, 1500 requests per day
- **Models**: Gemini Pro (very capable)
- **Setup**:
  1. Visit https://aistudio.google.com/
  2. Create project and enable Generative AI API
  3. Generate API key
  4. Add to `.env.local`: `NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_key_here`

### 3. Hugging Face
- **Free Tier**: 1000 requests per month
- **Models**: Various open-source models
- **Setup**:
  1. Visit https://huggingface.co/
  2. Create account
  3. Go to Settings > Access Tokens
  4. Create new token
  5. Add to `.env.local`: `NEXT_PUBLIC_HUGGINGFACE_API_KEY=your_key_here`

### 4. Anthropic Claude (Limited)
- **Free Tier**: Very limited
- **Models**: Claude 3 Haiku
- **Setup**:
  1. Visit https://console.anthropic.com/
  2. Create account
  3. Generate API key
  4. Add to `.env.local`: `NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key_here`

## Environment Variables

Create or update your `.env.local` file with:

```bash
# AI Services for PDF Extraction (add any/all that you have)
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-openai-key-here
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your-google-ai-key-here
NEXT_PUBLIC_HUGGINGFACE_API_KEY=hf_your-hugging-face-key-here
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

## Usage Priority

The system will try services in this order:
1. **Google Gemini** (best free tier)
2. **OpenAI GPT-3.5** (high quality)
3. **Hugging Face** (fallback)
4. **Anthropic Claude** (if available)
5. **Regex Extraction** (fallback if all fail)

## Cost Optimization Tips

1. **Start with Google Gemini** - Most generous free tier
2. **Use OpenAI sparingly** - Save credits for complex extractions
3. **Monitor usage** - Check usage stats in the app
4. **Fallback gracefully** - System works without AI too

## Expected Improvements with AI

- **Better Family Member Detection**: Identifies health conditions, preferences
- **Accurate Meal Timing**: Understands various time formats
- **Smart Grocery Categorization**: Categorizes items intelligently
- **Nutritional Insights**: Extracts dietary guidelines and restrictions
- **Error Handling**: More resilient to PDF format variations

## Testing

1. Add at least one API key to `.env.local`
2. Restart your development server
3. Upload a PDF in meal planning
4. Check console for AI extraction logs
5. Verify extracted data quality

## Troubleshooting

### "No AI services available"
- Check that at least one API key is set
- Verify API keys are valid
- Check internet connection

### "All AI services failed"
- API keys might be invalid or expired
- Service might be temporarily down
- Falls back to regex extraction automatically

### Rate Limits
- System tracks usage automatically
- Switches to next available service
- Monthly limits reset automatically

## Future Enhancements

- Add more AI services (Cohere, Replicate, etc.)
- Implement intelligent caching
- Add confidence scoring for extractions
- Support for multiple PDF formats
- Custom fine-tuning for better accuracy