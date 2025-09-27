// Full end-to-end test of PDF extraction with Gemini
// Run with: node test-final-extraction.js

const API_KEY = 'AIzaSyDzEHyoWKgCMUYzNHh-umeER-dYVthPU8w';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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

Lunch - 1:00 PM
Rice (1 cup cooked per person)
Sambar (1 bowl per person)

Kitchen Checklist:
Rice: 2.0 kg
Dal: 1.5 kg  
Mixed vegetables: 2.0 kg
Cooking oil: 200 ml
`;

async function testFinalExtraction() {
  console.log('🧪 Final AI PDF Extraction Test with Gemini 2.5\n');
  
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extract meal planning data from this text. Return only valid JSON with this structure:

{
  "meals": [{"time": "06:00", "title": "Early Morning", "description": "details"}],
  "familyMembers": [{"name": "Ravi", "medicalConditions": ["thyroid"], "portionMultiplier": 1.0}],
  "groceries": [{"name": "Rice", "quantity": "2 kg", "category": "grains"}]
}

Text to extract from:
${samplePDFText}`
          }]
        }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 4000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let extractedText = data.candidates[0].content.parts[0].text;
      
      // Clean markdown formatting
      extractedText = extractedText.replace(/```json\s*/gi, '');
      extractedText = extractedText.replace(/```\s*$/gi, '');
      extractedText = extractedText.trim();
      
      try {
        const parsedData = JSON.parse(extractedText);
        
        console.log('🎉 SUCCESS! Data extracted:');
        console.log('=====================================');
        console.log('🍽️  Meals:', parsedData.meals?.length || 0);
        console.log('👥  Family members:', parsedData.familyMembers?.length || 0);
        console.log('🛒  Groceries:', parsedData.groceries?.length || 0);
        
        if (parsedData.meals?.length > 0) {
          console.log('\n📅 MEALS:');
          parsedData.meals.forEach((meal, i) => {
            console.log(`${i+1}. ${meal.time} - ${meal.title}`);
          });
        }
        
        if (parsedData.familyMembers?.length > 0) {
          console.log('\n👥 FAMILY MEMBERS:');
          parsedData.familyMembers.forEach((member, i) => {
            console.log(`${i+1}. ${member.name}${member.medicalConditions?.length ? ` (${member.medicalConditions.join(', ')})` : ''}`);
          });
        }
        
        if (parsedData.groceries?.length > 0) {
          console.log('\n🛒 GROCERIES:');
          parsedData.groceries.slice(0, 5).forEach((item, i) => {
            console.log(`${i+1}. ${item.name}: ${item.quantity}`);
          });
        }
        
        console.log('\n✅ Gemini API integration working perfectly!');
        console.log('🚀 Ready for production use in your meal planning app');
        
      } catch (parseError) {
        console.log('❌ JSON Parse Error:', parseError.message);
        console.log('Raw text:', extractedText.substring(0, 300) + '...');
      }
      
    } else {
      console.log('❌ Unexpected API response format');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testFinalExtraction();