// AI-powered PDF data extraction service
// Supports multiple free AI APIs with fallback mechanism

import { FamilyMember, MealSlot, GroceryItem, NutritionSummary } from '../types/diet-tracker';

export interface ExtractedPDFData {
  meals: Partial<MealSlot>[];
  groceries: Partial<GroceryItem>[];
  nutrition: Partial<NutritionSummary>;
  familyMembers: Partial<FamilyMember>[];
  extractionMethod: string;
  confidence: number;
}

// Configuration for different AI services
interface AIServiceConfig {
  name: string;
  apiKey?: string;
  endpoint: string;
  enabled: boolean;
  freeLimit: number; // requests per month
}

const AI_SERVICES: AIServiceConfig[] = [
  {
    name: 'Google Gemini',
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    enabled: true,
    freeLimit: 1500 // 1500 requests per day
  },
  {
    name: 'OpenAI',
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    enabled: false, // Disabled for now
    freeLimit: 100
  },
  {
    name: 'Hugging Face',
    apiKey: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
    endpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
    enabled: false, // Disabled for now
    freeLimit: 1000
  },
  {
    name: 'Anthropic Claude',
    apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    endpoint: 'https://api.anthropic.com/v1/messages',
    enabled: false, // Disabled for now
    freeLimit: 100
  }
];

// System prompt for AI extraction
const EXTRACTION_PROMPT = `
Extract meal planning data from the provided text. Return only valid JSON with this exact structure.
IMPORTANT: Escape all newlines, quotes, and special characters in descriptions.

{
  "meals": [
    {"time": "HH:MM", "title": "Meal Name", "description": "Details (use \\n for line breaks)"}
  ],
  "familyMembers": [
    {"name": "Name", "age": 30, "medicalConditions": ["condition1"], "portionMultiplier": 1.0, "preferences": {"favoriteFruits": [], "dislikedFoods": [], "allergies": []}}
  ],
  "groceries": [
    {"name": "Item Name", "quantity": "amount", "category": "category", "priority": "medium"}
  ],
  "nutrition": {
    "dailyTargets": {"water": 3.5, "oil": 4.0},
    "guidelines": ["guideline1"]
  }
}

Extract all available information accurately. Use reasonable defaults for missing data.
Return ONLY the JSON object, no markdown formatting, no explanatory text.
`;

class AIExtractor {
  private currentServiceIndex = 0;
  private requestCounts: Record<string, number> = {};
  private lastRequestTimes: Record<string, number> = {};
  private readonly minRequestInterval = 2000; // 2 seconds between requests

  async extractFromPDF(pdfText: string): Promise<ExtractedPDFData> {
    const availableServices = AI_SERVICES.filter(service => 
      service.enabled && 
      service.apiKey && 
      (this.requestCounts[service.name] || 0) < service.freeLimit
    );

    if (availableServices.length === 0) {
      console.warn('No AI services available, falling back to regex extraction');
      return this.fallbackExtraction(pdfText);
    }

    // Try each available service
    for (const service of availableServices) {
      try {
        console.log(`🤖 Attempting extraction with ${service.name}...`);
        
        // Rate limiting: ensure minimum time between requests
        const lastRequestTime = this.lastRequestTimes[service.name] || 0;
        const timeSinceLastRequest = Date.now() - lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
          const waitTime = this.minRequestInterval - timeSinceLastRequest;
          console.log(`⏳ Rate limiting: waiting ${waitTime}ms before ${service.name} request...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Record request time
        this.lastRequestTimes[service.name] = Date.now();
        
        const result = await this.extractWithService(service, pdfText);
        
        // Increment request count
        this.requestCounts[service.name] = (this.requestCounts[service.name] || 0) + 1;
        
        console.log(`✅ Successfully extracted with ${service.name}`);
        return {
          ...result,
          extractionMethod: service.name,
          confidence: 0.9
        };
      } catch (error) {
        console.error(`❌ ${service.name} extraction failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        // If it's a 503 error, let the user know it's temporary
        if (error instanceof Error && error.message.includes('503')) {
          console.log(`⏳ ${service.name} is temporarily overloaded, trying next service...`);
        }
        continue;
      }
    }

    // If all AI services fail, use fallback
    console.warn('All AI services failed, using fallback extraction');
    return this.fallbackExtraction(pdfText);
  }

  private async extractWithService(service: AIServiceConfig, pdfText: string): Promise<ExtractedPDFData> {
    switch (service.name) {
      case 'OpenAI':
        return this.extractWithOpenAI(service, pdfText);
      case 'Hugging Face':
        return this.extractWithHuggingFace(service, pdfText);
      case 'Google Gemini':
        return this.extractWithGemini(service, pdfText);
      case 'Anthropic Claude':
        return this.extractWithClaude(service, pdfText);
      default:
        throw new Error(`Unsupported service: ${service.name}`);
    }
  }

  private async extractWithOpenAI(service: AIServiceConfig, pdfText: string): Promise<ExtractedPDFData> {
    const response = await fetch(service.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${service.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: `Extract data from this family diet plan:\n\n${pdfText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    try {
      const parsedData = JSON.parse(extractedText);
      return this.normalizeExtractedData(parsedData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  private async extractWithGemini(service: AIServiceConfig, pdfText: string): Promise<ExtractedPDFData> {
    // Use the GoogleGenerativeAI SDK for more reliable API interaction
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(service.apiKey!);
    
    // Only use the experimental model since others are not available with this API key
    const modelName = 'gemini-2.0-flash-exp';
    
    // Implement retry logic for 503 errors (service overload)
    const maxRetries = 3;
    const retryDelays = [1000, 3000, 5000]; // 1s, 3s, 5s delays
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🤖 Attempting extraction with ${modelName} (attempt ${attempt + 1}/${maxRetries})`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent([
          `${EXTRACTION_PROMPT}\n\nText to extract from:\n${pdfText}`
        ]);

        const extractedText = result.response.text();
        
        if (!extractedText) {
          throw new Error(`Empty response from ${modelName}`);
        }

        // Clean and sanitize the response
        let cleanText = extractedText;
        
        // Remove markdown formatting
        cleanText = cleanText.replace(/```json\s*/gi, '');
        cleanText = cleanText.replace(/```\s*$/gi, '');
        
        // Remove any leading/trailing whitespace
        cleanText = cleanText.trim();
        
        // Remove any text before the first { or after the last }
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          throw new Error('No valid JSON structure found in response');
        }
        
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        
        try {
          const parsedData = JSON.parse(cleanText);
          console.log(`✅ Successfully extracted data with ${modelName} on attempt ${attempt + 1}`);
          return this.normalizeExtractedData(parsedData);
        } catch (parseError) {
          console.error(`Failed to parse ${modelName} response:`, parseError);
          console.error('Cleaned text:', cleanText.substring(0, 500));
          throw parseError; // Don't retry for parse errors
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`${modelName} attempt ${attempt + 1} failed:`, errorMessage);
        
        // Check if it's a 503 error (service overload) and we have retries left
        if (errorMessage.includes('503') && attempt < maxRetries - 1) {
          const delay = retryDelays[attempt];
          console.log(`⏳ Service overloaded, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Try again
        }
        
        // For non-503 errors, or if we've exhausted retries, fall back
        if (attempt === maxRetries - 1) {
          console.error('All retry attempts failed, falling back to regex extraction');
          return this.fallbackExtraction(pdfText);
        }
      }
    }
    
    // This should never be reached due to the fallback in the loop
    return this.fallbackExtraction(pdfText);
  }

  private async extractWithHuggingFace(service: AIServiceConfig, pdfText: string): Promise<ExtractedPDFData> {
    // Note: Hugging Face free inference API has limitations for complex extraction
    // This is a simplified implementation
    const prompt = `${EXTRACTION_PROMPT}\n\nText: ${pdfText.substring(0, 1000)}...`;
    
    const response = await fetch(service.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${service.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 1000,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Hugging Face response format varies, fallback to regex if needed
    return this.fallbackExtraction(pdfText);
  }

  private async extractWithClaude(service: AIServiceConfig, pdfText: string): Promise<ExtractedPDFData> {
    const response = await fetch(service.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': service.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nExtract data from this family diet plan:\n\n${pdfText}`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.content[0].text;
    
    try {
      const parsedData = JSON.parse(extractedText);
      return this.normalizeExtractedData(parsedData);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      throw new Error('Invalid JSON response from Claude');
    }
  }

  private normalizeExtractedData(rawData: any): ExtractedPDFData {
    return {
      meals: rawData.meals || [],
      groceries: rawData.groceries || [],
      nutrition: rawData.nutrition || {},
      familyMembers: rawData.familyMembers || [],
      extractionMethod: 'AI',
      confidence: 0.9
    };
  }

  private fallbackExtraction(pdfText: string): ExtractedPDFData {
    // Use your existing regex-based extraction as fallback
    const timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)?/gi;
    const mealRegex = /(Early Morning|Breakfast|Mid-Morning|Lunch|Evening Snack|Dinner|Bedtime)/gi;
    
    const meals: Partial<MealSlot>[] = [];
    const groceries: Partial<GroceryItem>[] = [];
    const familyMembers: Partial<FamilyMember>[] = [];
    
    // Basic regex extraction logic (simplified version of your existing code)
    const lines = pdfText.split('\n');
    let currentMeal: Partial<MealSlot> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const mealMatch = line.match(mealRegex);
      const timeMatch = line.match(timeRegex);
      
      if (mealMatch && timeMatch) {
        if (currentMeal) {
          meals.push(currentMeal);
        }
        currentMeal = {
          time: timeMatch[0].replace(/\s*(AM|PM)/i, ''),
          title: mealMatch[0],
          description: line.replace(mealMatch[0], '').replace(timeMatch[0], '').trim()
        };
      } else if (currentMeal && line && !line.includes(':')) {
        currentMeal.description = (currentMeal.description || '') + ' ' + line;
      }
    }
    
    if (currentMeal) meals.push(currentMeal);

    // Extract basic family members
    const familyMemberLines = lines.filter(line => 
      line.toLowerCase().includes('family members') ||
      line.toLowerCase().includes('ravi') ||
      line.toLowerCase().includes('father') ||
      line.toLowerCase().includes('mother') ||
      line.toLowerCase().includes('brother') ||
      line.toLowerCase().includes('wife')
    );

    // Basic family member extraction
    if (familyMemberLines.length > 0) {
      const memberNames = ['Ravi', 'Father', 'Mother', 'Brother', 'Wife'];
      memberNames.forEach(name => {
        const memberLine = familyMemberLines.find(line => 
          line.toLowerCase().includes(name.toLowerCase())
        );
        if (memberLine) {
          familyMembers.push({
            name,
            age: name === 'Father' ? 60 : name === 'Mother' ? 55 : 30,
            medicalConditions: memberLine.includes('thyroid') ? ['thyroid'] : [],
            dietaryRestrictions: [],
            preferences: {
              favoriteFruits: [],
              dislikedFoods: [],
              allergies: []
            },
            portionMultiplier: name === 'Brother' ? 1.2 : 1.0
          });
        }
      });
    }

    return {
      meals,
      groceries,
      nutrition: { dailyTargets: { water: 3.5, oil: 4.5 } },
      familyMembers,
      extractionMethod: 'Regex Fallback',
      confidence: 0.6
    };
  }

  // Reset request counts (call this monthly)
  resetRequestCounts() {
    this.requestCounts = {};
  }

  // Get current usage stats
  getUsageStats() {
    return {
      services: AI_SERVICES.map(service => ({
        name: service.name,
        enabled: service.enabled,
        hasApiKey: !!service.apiKey,
        requestCount: this.requestCounts[service.name] || 0,
        limit: service.freeLimit,
        remaining: service.freeLimit - (this.requestCounts[service.name] || 0)
      }))
    };
  }
}

// Export singleton instance
export const aiExtractor = new AIExtractor();

// Helper function for easy integration
export async function extractPDFDataWithAI(pdfText: string): Promise<ExtractedPDFData> {
  return aiExtractor.extractFromPDF(pdfText);
}