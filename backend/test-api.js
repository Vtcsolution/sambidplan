// backend/test-api.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fetchSAMOpportunities } from './services/samApiService.js';

dotenv.config();

const testAPI = async () => {
  console.log('🧪 Testing SAM.gov API directly...');
  console.log('API Key:', process.env.SAM_API_KEY?.substring(0, 20) + '...');
  
  // Connect to MongoDB first
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (dbError) {
    console.error('❌ MongoDB connection error:', dbError.message);
    process.exit(1);
  }
  
  const results = await fetchSAMOpportunities('541511', 10);
  
  console.log(`\n📊 Results: ${results.length} opportunities found`);
  
  if (results.length > 0) {
    console.log('\n📝 First opportunity:');
    console.log('Title:', results[0].title);
    console.log('Agency:', results[0].agency);
    console.log('Due Date:', results[0].dueDate);
    console.log('NAICS:', results[0].naicsCode);
  } else {
    console.log('\n⚠️ No results from API - check your API key and permissions');
  }
  
  // Close MongoDB connection
  await mongoose.disconnect();
  console.log('👋 Test complete');
  process.exit(0);
};

testAPI();