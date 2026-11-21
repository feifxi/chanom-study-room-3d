'use client';

import { MapEditor } from '@/features/admin/MapEditor';

/** Admin-only map editor (feature 7). In the real app this sits behind the admin sign-in. */
export default function MapsAdminPage() {
  return <MapEditor />;
}
