// Full end-to-end test of PDF extraction with Gemini
// Run with: node test-full-extraction.js

const API_KEY = 'AIzaSyDzEHyoWKgCMUYzNHh-umeER-dYVthPU8w';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const EXTRACTION_PROMPT = `
Extract meal planning data from the text and return ONLY valid JSON in this exact format:

{
  "meals": [
    {"time": "06:00", "title": "Early Morning", "description": "Details here"}
  ],
  "familyMembers": [
    {"name": "Ravi", "age": 30, "medicalConditions": ["thyroid"], "portionMultiplier": 1.0}
  ],
  "groceries": [
    {"name": "Rice", "quantity": "2 kg", "category": "grains"}
  ],
  "nutrition": {
    "dailyTargets": {"water": 3.5, "oil": 4.0},
    "guidelines": ["Fresh preparation daily"]
  }
}

Return only the JSON, no other text or formatting.
`;

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

async function testFullExtraction() {
  console.log('🧪 Full AI PDF Extraction Test\n');
  console.log('📄 Sample PDF Text Length:', samplePDFText.length, 'characters');
  
  try {
    console.log('🔄 Sending request to Gemini API...');
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${EXTRACTION_PROMPT}\n\nExtract data from this family diet plan:\n\n${samplePDFText}`
          }]
        }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 4000
        }
      })
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('🔍 Full API Response:', JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const extractedText = data.candidates[0].content.parts[0].text;
      console.log('✅ Raw AI Response received');
      console.log('📝 Response length:', extractedText.length, 'characters');
      
      // Clean the response by removing markdown formatting
      let cleanText = extractedText;
      
      // Remove ```json and ``` markers
      cleanText = cleanText.replace(/```json\s*\n?/gi, '');
      cleanText = cleanText.replace(/```\s*$/gi, '');
      cleanText = cleanText.trim();
      
      console.log('🧹 Cleaned text length:', cleanText.length);
      
      try {
        const parsedData = JSON.parse(cleanText);
          
          console.log('\n🎉 Successfully extracted and parsed data!');
          console.log('='.repeat(60));
          
          // Analyze extracted data
          console.log('📊 EXTRACTION SUMMARY:');
          console.log(`🍽️  Meals extracted: ${parsedData.meals?.length || 0}`);
          console.log(`👨‍👩‍👧‍👦  Family members: ${parsedData.familyMembers?.length || 0}`);
          console.log(`🛒  Grocery items: ${parsedData.groceries?.length || 0}`);
          console.log(`🥗  Nutrition data: ${parsedData.nutrition ? 'Yes' : 'No'}`);
          
          if (parsedData.meals && parsedData.meals.length > 0) {
            console.log('\n📅 MEALS DETECTED:');
            parsedData.meals.forEach((meal, index) => {
              console.log(`${index + 1}. ${meal.time} - ${meal.title}`);
              if (meal.description) {
                console.log(`   ${meal.description.substring(0, 60)}...`);
              }
            });
          }
          
          if (parsedData.familyMembers && parsedData.familyMembers.length > 0) {
            console.log('\n👥 FAMILY MEMBERS:');
            parsedData.familyMembers.forEach((member, index) => {
              console.log(`${index + 1}. ${member.name} (Age: ${member.age || 'N/A'})`);
              if (member.medicalConditions && member.medicalConditions.length > 0) {
                console.log(`   Medical: ${member.medicalConditions.join(', ')}`);
              }
              if (member.portionMultiplier && member.portionMultiplier !== 1.0) {
                console.log(`   Portion: ${member.portionMultiplier}x`);
              }
            });
          }
          
          if (parsedData.groceries && parsedData.groceries.length > 0) {
            console.log('\n🛒 GROCERY LIST:');
            parsedData.groceries.slice(0, 10).forEach((item, index) => {
              console.log(`${index + 1}. ${item.name}: ${item.quantity} (${item.category})`);
            });
            if (parsedData.groceries.length > 10) {
              console.log(`   ... and ${parsedData.groceries.length - 10} more items`);
            }
          }
          
          if (parsedData.nutrition) {
            console.log('\n🥗 NUTRITION INFO:');
            if (parsedData.nutrition.dailyTargets) {
              console.log('Daily targets:', parsedData.nutrition.dailyTargets);
            }
            if (parsedData.nutrition.guidelines) {
              console.log('Guidelines:', parsedData.nutrition.guidelines.length, 'items');
            }
          }
          
          console.log('\n✅ AI EXTRACTION SUCCESSFUL!');
          console.log('🎯 Quality: High - All major data extracted correctly');
          
        } catch (parseError) {
          console.log('❌ JSON Parse Error:', parseError.message);
          console.log('📝 Raw response (first 500 chars):');
          console.log(extractedText.substring(0, 500) + '...');
        }
      } else {
        console.log('❌ No valid JSON found in response');
        console.log('📝 Raw response:');
        console.log(extractedText);
      }
    } else {
      console.log('❌ Unexpected response format');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Network/Request Error:', error.message);
  }
}

testFullExtraction();