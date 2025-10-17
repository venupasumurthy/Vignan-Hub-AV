import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68f20b9f302c722f7ad1fdd2", 
  requiresAuth: true // Ensure authentication is required for all operations
});
