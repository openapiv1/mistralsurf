import { NextRequest } from 'next/server';
import { testMistralIntegration } from '@/lib/test-mistral';

export async function GET() {
  try {
    const result = await testMistralIntegration();
    
    if (result.success) {
      return Response.json({ 
        status: 'success', 
        message: 'Mistral AI integration is working!',
        response: result.response 
      });
    } else {
      return Response.json({ 
        status: 'error', 
        message: 'Mistral AI integration failed',
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: 'Test failed',
      error: String(error) 
    }, { status: 500 });
  }
}