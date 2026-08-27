import { isAdminAccountEmail } from '@/lib/auth/admin-account';
import { useScreenshotPreviewOptional } from '@/providers/screenshot-preview-provider';
import { useSession } from '@/providers/session-provider';

export function useAdminAccount() {
  const { user } = useSession();
  const preview = useScreenshotPreviewOptional();

  const realIsAdminAccount = isAdminAccountEmail(user?.email);
  const previewMode = preview?.mode ?? 'live';
  const isAdminAccount =
    previewMode === 'no-key' || previewMode === 'no-pro' ? false : realIsAdminAccount;

  return { isAdminAccount, realIsAdminAccount };
}
