// Example environment file - DO NOT add real secrets here.
// Copy this file to environment.ts and environment.prod.ts and fill in your actual keys.
export const environment = {
  production: false,
  apiUrl: 'https://your-supabase-project.supabase.co',
  supabase: {
    url: 'https://your-supabase-project.supabase.co',
    anonKey: 'your-supabase-anon-key',
  },
  cloudinary: {
    cloudName: 'your-cloud-name',
    apiKey: 'your-api-key',
    apiSecret: 'your-api-secret',
  },
};
