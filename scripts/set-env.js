const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '..', 'src', 'environments');
const targetPath = path.join(envDir, 'environment.ts');
const targetProdPath = path.join(envDir, 'environment.prod.ts');

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://bszmosbayxdxcnmbqfqb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_lsF3PWwlxZqHV0zamPgDTQ_OEvIX14T';
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'kplcwxzo';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '754356963727787';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || 'F-rHh09GltQLO7DUUW0ybTWHlK0';

const envConfigFile = `export const environment = {
  production: false,
  apiUrl: '${supabaseUrl}',
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
  cloudinary: {
    cloudName: '${cloudinaryCloudName}',
    apiKey: '${cloudinaryApiKey}',
    apiSecret: '${cloudinaryApiSecret}',
  },
};
`;

const envProdConfigFile = `export const environment = {
  production: true,
  apiUrl: '${supabaseUrl}',
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
  cloudinary: {
    cloudName: '${cloudinaryCloudName}',
    apiKey: '${cloudinaryApiKey}',
    apiSecret: '${cloudinaryApiSecret}',
  },
};
`;

// Always write if missing or if running in CI/Vercel or if explicitly executed
if (!fs.existsSync(targetPath) || process.env.VERCEL || process.env.CI) {
  fs.writeFileSync(targetPath, envConfigFile, { encoding: 'utf8' });
  console.log(`[set-env] Generated ${targetPath}`);
}

if (!fs.existsSync(targetProdPath) || process.env.VERCEL || process.env.CI) {
  fs.writeFileSync(targetProdPath, envProdConfigFile, { encoding: 'utf8' });
  console.log(`[set-env] Generated ${targetProdPath}`);
}
