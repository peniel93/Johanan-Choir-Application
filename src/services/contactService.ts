import { supabase } from '../lib/supabase';
import { ContactMessageInput, ContactRecipientsInfo } from '../types';
import { fetchActiveContactReceiverEmails } from './contactReceiversService';

export const SUPER_ADMIN_CONTACT_EMAIL = 'penielabebe93abebe@gmail.com';

function normalizeEmails(values: string[]) {
  const normalized = values
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

  return Array.from(new Set(normalized));
}

export async function getContactRecipientsInfo(): Promise<ContactRecipientsInfo> {
  let activeReceivers: string[] = [];
  try {
    activeReceivers = await fetchActiveContactReceiverEmails();
  } catch {
    // Keep fallback recipient when receiver table/policy is unavailable.
  }

  return {
    recipients: normalizeEmails([SUPER_ADMIN_CONTACT_EMAIL, ...activeReceivers]),
  };
}

export async function submitContactMessage(payload: ContactMessageInput) {
  const recipientsInfo = await getContactRecipientsInfo();
  const normalizedSelectedEmail = payload.targetEmail?.trim().toLowerCase() ?? '';
  const selectedRecipients = normalizedSelectedEmail && recipientsInfo.recipients.includes(normalizedSelectedEmail)
    ? [normalizedSelectedEmail]
    : recipientsInfo.recipients;
  const targetEmail = selectedRecipients.join(', ');

  const { data, error } = await supabase
    .from('contact_messages')
    .insert({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      message: payload.message.trim(),
      lyric_suggestion: payload.lyricSuggestion.trim() || null,
      spelling_error: payload.spellingError.trim() || null,
      target_email: targetEmail,
    })
    .select('id, created_at, target_email')
    .single();

  if (error) {
    if (error.message.includes("Could not find the table 'public.contact_messages'")) {
      throw new Error('contact_messages table አልተፈጠረም። supabase-schema.sql ያስኬዱ።');
    }

    if (error.message.toLowerCase().includes('row-level security')) {
      throw new Error('RLS policy ችግር አለ። contact_messages_public_insert policy እንዳለ ያረጋግጡ።');
    }

    throw new Error(error.message);
  }

  return {
    ...(data ?? {}),
    recipients: selectedRecipients,
  };
}
