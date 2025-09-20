// Test Firebase authentication and temple creation
const testFirebaseAuth = async () => {
  console.log('Testing Firebase authentication...');
  
  try {
    // Check if Firebase is initialized
    console.log('Firebase config loaded');
    
    // Test anonymous authentication
    const { signInAnonymously } = await import('firebase/auth');
    const { auth } = await import('./src/lib/firebase');
    
    console.log('Attempting anonymous sign-in...');
    const result = await signInAnonymously(auth);
    console.log('Anonymous sign-in successful:', result.user.uid);
    
    // Test temple creation
    const { createTemplePlan } = await import('./src/lib/firebase/temples');
    
    const testPlan = {
      templeName: 'Test Temple',
      deity: 'Test Deity',
      address: 'Test Address',
      location: { lat: 0, lng: 0 },
      vowReason: 'Test reason',
      due: false,
      soloOrGroup: 'SOLO' as const,
      companions: '',
      transportMode: 'CAR' as const,
      routeStartLabel: '',
      routeWaypointNotes: '',
      hotelName: '',
      hotelAddress: '',
      stayNotes: '',
      plannedBudget: 1000,
      savedSoFar: 500,
      checklist: [],
      tags: 'test',
      status: 'PLANNING' as const
    };
    
    console.log('Attempting to create temple plan...');
    const planId = await createTemplePlan(result.user.uid, testPlan);
    console.log('Temple plan created successfully:', planId);
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
};

// Run test if this is run directly
if (typeof window !== 'undefined') {
  testFirebaseAuth();
}

export default testFirebaseAuth;