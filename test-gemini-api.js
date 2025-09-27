// Direct test of Gemini API with your key
// Run with: node test-gemini-api.js

const API_KEY = 'AIzaSyDzEHyoWKgCMUYzNHh-umeER-dYVthPU8w';

async function listAvailableModels() {
  console.log('🔍 Checking available Gemini models...\n');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error listing models:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Available models:');
    
    if (data.models) {
      data.models.forEach(model => {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          console.log(`✅ ${model.name} - ${model.displayName}`);
        }
      });
    }
    
    // Try with the most common model name
    await testWithModel('gemini-2.5-flash');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testWithModel(modelName) {
  console.log(`\n🧪 Testing with model: ${modelName}`);
  
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello, can you help me extract data from text? Just say "Yes, I can help!"'
          }]
        }]
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0]) {
        const text = data.candidates[0].content.parts[0].text;
        console.log('✅ Success! Response:', text);
        console.log(`\n🎉 Working model found: ${modelName}`);
        return modelName;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  return null;
}

listAvailableModels();