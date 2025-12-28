import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { AdminLayout } from '@/components/layout/AdminLayout';

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const { canAccessAdmin } = useAuthStore.getState();

    // Check if user can access admin console
    if (!canAccessAdmin()) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: AdminLayout,
});
