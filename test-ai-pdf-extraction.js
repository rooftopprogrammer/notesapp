// Test script for AI PDF extraction functionality
// Run with: node test-ai-pdf-extraction.js

const samplePDFText = `
Family Diet Plan - Sunday, September 27, 2025

Family Members:
- Ravi (thyroid condition, 4 tsp oil limit, main person)
- Mother (thyroid condition, 4 tsp oil)
- Father (4 tsp oil, prefers guava)
- Brother (4 tsp oil, 1.2x portions)
- Wife (breastfeeding, 5 tsp oil, special nutrition needs)

Early Morning - 6:00 AM
Warm water with honey and lemon (1 glass)

Breakfast - 8:00 AM
Idli (4 pieces per person)
Coconut chutney (2 tbsp)
Coffee or tea (1 cup)

Mid-Morning - 10:30 AM
Seasonal fruits - Guava (1 medium, preferred for father)
Apple (1 medium for others)

Lunch - 1:00 PM
Rice (1 cup cooked per person)
Sambar (1 bowl per person)
Mixed vegetable curry (1/2 cup per person)
Buttermilk (1 glass per person)

Evening Snack - 4:00 PM
Green tea (1 cup)
Roasted nuts (10-15 pieces per person)

Dinner - 7:30 PM
Chapati (2 pieces per person, 3 for brother)
Dal curry (1 bowl per person)
Vegetable stir-fry (1/2 cup per person)

Bedtime - 9:30 PM
Warm turmeric milk (1 glass per person)

Kitchen Checklist:
Rice: 2.0 kg
Dal: 1.5 kg  
Mixed vegetables: 2.0 kg
Cooking oil: 200 ml
Chapati flour: 1.0 kg
Turmeric powder: 50 g
Cumin powder: 100 g
Coriander powder: 100 g
Fresh fruits: 3.0 kg
Milk: 2.0 liters
Honey: 500 g
Coconut: 2.0 pieces
Onions: 1.0 kg

Dietary Guidelines:
- Oil limit: 4 tsp for Ravi, Mother, Father, Brother; 5 tsp for wife (breastfeeding)
- Water intake: minimum 3 liters per day
- No processed foods
- Fresh preparation daily
- Extra portions for brother (1.2x)
- Special nutrition for breastfeeding wife
`;

async function testAIExtraction() {
  console.log('🧪 Testing AI PDF Extraction\n');
  
  // Test regex fallback (works without API keys)
  console.log('📝 Testing Regex Fallback Extraction...');
  const regexResult = testRegexExtraction(samplePDFText);
  console.log('Meals found:', regexResult.meals.length);
  console.log('Family members found:', regexResult.familyMembers.length);
  console.log('Sample meal:', regexResult.meals[0]);
  console.log('Sample family member:', regexResult.familyMembers[0]);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test AI extraction (requires API keys)
  console.log('🤖 Testing AI Extraction...');
  console.log('Note: This requires API keys in environment variables');
  
  const availableServices = [];
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) availableServices.push('OpenAI');
  if (process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) availableServices.push('Google Gemini');
  if (process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY) availableServices.push('Hugging Face');
  if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) availableServices.push('Anthropic');
  
  if (availableServices.length === 0) {
    console.log('❌ No AI services configured');
    console.log('Add API keys to .env.local to test AI extraction');
    console.log('Available services: OpenAI, Google Gemini, Hugging Face, Anthropic');
  } else {
    console.log('✅ Available AI services:', availableServices.join(', '));
    console.log('AI extraction would be used in production');
  }
  
  console.log('\n📊 Expected Improvements with AI:');
  console.log('• Better family member health condition detection');
  console.log('• More accurate meal time parsing');
  console.log('• Smart grocery categorization');
  console.log('• Nutritional insight extraction');
  console.log('• Handling of various PDF formats');
}

function testRegexExtraction(pdfText) {
  const timeRegex = /(\d{1,2}:\d{2})\s*(AM|PM)?/gi;
  const mealRegex = /(Early Morning|Breakfast|Mid-Morning|Lunch|Evening Snack|Dinner|Bedtime)/gi;
  
  const meals = [];
  const familyMembers = [];
  
  // Extract meals
  const lines = pdfText.split('\n');
  let currentMeal = null;
  
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
  
  // Extract family members
  const memberNames = ['Ravi', 'Father', 'Mother', 'Brother', 'Wife'];
  memberNames.forEach(name => {
    const memberLine = lines.find(line => 
      line.toLowerCase().includes(name.toLowerCase()) && 
      line.includes('(')
    );
    if (memberLine) {
      familyMembers.push({
        name,
        details: memberLine.trim(),
        hasThyroid: memberLine.includes('thyroid'),
        isBreastfeeding: memberLine.includes('breastfeeding'),
        portionMultiplier: memberLine.includes('1.2x') ? 1.2 : 1.0
      });
    }
  });
  
  return { meals, familyMembers };
}

// Run the test
testAIExtraction().catch(console.error);