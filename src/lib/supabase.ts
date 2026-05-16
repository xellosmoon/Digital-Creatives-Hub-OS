import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as { env: { VITE_SUPABASE_URL?: string } }).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as { env: { VITE_SUPABASE_ANON_KEY?: string } }).env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);
console.log('All env vars:', (import.meta as { env: Record<string, string> }).env);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey);
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get the current user
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper function to get user profile
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// Helper function to check if user is admin
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const isUserAdmin = async (userId: string) => {
  try {
    const profile = await getUserProfile(userId);
    return profile?.role === 'admin';
  } catch {
    return false;
  }
};
