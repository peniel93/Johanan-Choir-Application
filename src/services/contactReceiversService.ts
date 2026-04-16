import { supabase } from '../lib/supabase';
import { ContactReceiver } from '../types';

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? fallback));
  }

  return new Error(fallback);
}

export async function fetchContactReceivers() {
  const { data, error } = await supabase
    .from('app_contact_receivers')
    .select('id,email,is_approved,is_active,created_at,updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw toError(error, 'Unable to load contact receivers.');
  }

  return (data as ContactReceiver[]) ?? [];
}

export async function addContactReceiver(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('app_contact_receivers')
    .insert({ email: normalizedEmail })
    .select('id,email,is_approved,is_active,created_at,updated_at')
    .single();

  if (error) {
    throw toError(error, 'Unable to add contact receiver.');
  }

  return data as ContactReceiver;
}

export async function updateContactReceiver(
  id: string,
  patch: Partial<Pick<ContactReceiver, 'is_approved' | 'is_active' | 'email'>>,
) {
  const payload: Partial<ContactReceiver> = {
    ...patch,
  };

  if (typeof patch.email === 'string') {
    payload.email = patch.email.trim().toLowerCase();
  }

  const { data, error } = await supabase
    .from('app_contact_receivers')
    .update(payload)
    .eq('id', id)
    .select('id,email,is_approved,is_active,created_at,updated_at')
    .single();

  if (error) {
    throw toError(error, 'Unable to update contact receiver.');
  }

  return data as ContactReceiver;
}

export async function deleteContactReceiver(id: string) {
  const { error } = await supabase
    .from('app_contact_receivers')
    .delete()
    .eq('id', id);

  if (error) {
    throw toError(error, 'Unable to remove contact receiver.');
  }
}

export async function fetchActiveContactReceiverEmails() {
  const { data, error } = await supabase
    .from('app_contact_receivers')
    .select('email')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('email', { ascending: true });

  if (error) {
    throw toError(error, 'Unable to load active receiver emails.');
  }

  return (data ?? [])
    .map((item) => String((item as { email?: unknown }).email ?? '').trim().toLowerCase())
    .filter((item) => item.length > 0);
}
