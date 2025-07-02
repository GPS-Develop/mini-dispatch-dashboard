import { createClient } from '@supabase/supabase-js';

// Admin client with service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key, not the anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createDriverAccount(
  email: string,
  name: string,
  phone: number,
  payRate: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Create user in Supabase Auth using magic link invitation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          name: name,
          role: 'driver'
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
      }
    );

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Create driver record in drivers table
    const { data: driverData, error: driverError } = await supabaseAdmin
      .from('drivers')
      .insert({
        name,
        phone: phone.toString(), // Convert to string for database
        email,
        pay_rate: payRate,
        status: 'Available',
        driver_status: 'active',
        auth_user_id: authData.user.id
      })
      .select()
      .single();

    if (driverError) {
      // If driver creation fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: driverError.message };
    }

    return { 
      success: true, 
      data: { 
        driver: driverData, 
        authUser: authData.user 
      } 
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 