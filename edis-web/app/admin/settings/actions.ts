'use server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveClassSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updates = {
    class_name: String(formData.get('class_name') ?? '').trim(),
    roster_limit: Number(formData.get('roster_limit')),
    default_buffer_min: Number(formData.get('default_buffer_min')),
    worst_case_absence_pct: Number(formData.get('worst_case_absence_pct')),
    secs_per_absent_check: Number(formData.get('secs_per_absent_check')),
    secs_per_present_reply: Number(formData.get('secs_per_present_reply')),
    review_deadline_time: String(formData.get('review_deadline_time')),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase.from('class_settings').select('id').single();
  if (existing) {
    await supabase.from('class_settings').update(updates).eq('id', existing.id);
  } else {
    await supabase.from('class_settings').insert(updates);
  }

  // Audit log
  await supabase.from('audit_log').insert({
    actor: user.email ?? 'admin',
    entity: 'class_settings',
    entity_id: existing?.id ?? null,
    field: 'multiple',
    new_value: JSON.stringify(updates),
    reason: 'Settings updated',
  });

  revalidatePath('/admin/settings');
}

export async function updateAdminCredentials(params: {
  currentPassword: string;
  newEmail?: string;
  newPassword?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated. Please sign in.' };
  }

  const { currentPassword, newEmail, newPassword } = params;

  if (!currentPassword) {
    return { error: 'Current password is required to authorize changes.' };
  }

  // 1. Verify current password
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: 'Current password is incorrect. Please verify and try again.' };
  }

  // 2. Validate new email or password
  const updates: { email?: string; password?: string; email_confirm?: boolean } = {};
  const trimmedEmail = newEmail?.trim().toLowerCase();

  if (trimmedEmail && trimmedEmail !== user.email?.toLowerCase()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { error: 'Please enter a valid email address.' };
    }
    updates.email = trimmedEmail;
    updates.email_confirm = true; // Auto-confirm email so admin isn't locked out
  }

  if (newPassword && newPassword.trim()) {
    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }
    updates.password = newPassword;
  }

  if (!updates.email && !updates.password) {
    return { error: 'No changes provided. Please enter a new email or password.' };
  }

  // 3. Update user using service client
  const serviceClient = createServiceClient();
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(
    user.id,
    updates
  );

  if (updateError) {
    return { error: updateError.message || 'Failed to update credentials.' };
  }

  // 4. Record in audit log
  await supabase.from('audit_log').insert({
    actor: user.email ?? 'admin',
    entity: 'admin_auth',
    entity_id: user.id,
    field: updates.email && updates.password ? 'email_and_password' : updates.email ? 'email' : 'password',
    new_value: JSON.stringify({
      email_changed: Boolean(updates.email),
      new_email: updates.email || user.email,
      password_changed: Boolean(updates.password),
    }),
    reason: 'Administrator credentials updated from Settings',
  });

  // 5. Sign out existing session so user signs in with fresh credentials
  await supabase.auth.signOut();

  return {
    success: true,
    newEmail: updates.email || user.email,
  };
}
