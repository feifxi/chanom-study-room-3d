import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { MAPS } from '@/lib/maps';

/**
 * Maps (feature 7). The map editor is built with the Blender work, on its map format, starting with
 * the Library; its approved design is noted in docs/features/07-maps.md. Until then the maps are
 * built in code, and this page says which is which.
 */
export default function MapsAdminPage() {
  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <AdminTitle title="Maps" note="Built in code for now. The map editor comes with the Blender models." />
      <div className="grid gap-3 sm:grid-cols-3">
        {MAPS.map((m) => (
          <div key={m.id} className="rounded-3xl border bg-card p-4">
            <p className="text-3xl">{m.emoji}</p>
            <p className="mt-2 font-black">{m.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.mood}</p>
            <div className="mt-3">{m.id === 'library' ? <Pill tone="ok">Main map</Pill> : <Pill tone="muted">Temporary map</Pill>}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Publishing a map update, versions and rollback arrive with the editor. Map polish waiting for it is listed in 07-maps.md.
      </p>
    </div>
  );
}
