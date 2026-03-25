"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BannerPosition = "left" | "left-2" | "right" | "right-2";

interface Banner {
  id: string;
  name: string;
  position: BannerPosition;
  adsense_slot?: string;
  image_url?: string;
  link_url?: string;
  is_active: boolean;
}

const POSITIONS: { value: BannerPosition; label: string }[] = [
  { value: "left",    label: "Vänster övre"  },
  { value: "left-2",  label: "Vänster nedre" },
  { value: "right",   label: "Höger övre"    },
  { value: "right-2", label: "Höger nedre"   },
];

const emptyForm = () => ({
  name: "",
  position: "left" as BannerPosition,
  adsense_slot: "",
  image_url: "",
  link_url: "",
  is_active: true,
});

export default function AdminCPMBannersPage() {
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [banners,  setBanners]  = useState<Banner[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Banner | null>(null);
  const [form,     setForm]     = useState(emptyForm());
  const [preview,  setPreview]  = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState("");
  const [error,    setError]    = useState("");

  async function load() {
    const { data } = await supabase.from("banners").select("*").order("created_at", { ascending: false });
    setBanners(data ?? []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(b: Banner) {
    setEditing(b);
    setForm({
      name: b.name, position: b.position,
      adsense_slot: b.adsense_slot ?? "",
      image_url: b.image_url ?? "",
      link_url: b.link_url ?? "",
      is_active: b.is_active,
    });
    setPreview(b.image_url ?? "");
    setCreating(false);
    setError("");
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm());
    setPreview("");
    setError("");
  }

  // Ladda upp bild via server-side API (service role kringgår Storage RLS)
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/upload-banner", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok) {
      setError("Uppladdning misslyckades: " + (json.error ?? res.statusText));
      setUploading(false);
      return;
    }

    setForm(f => ({ ...f, image_url: json.url, adsense_slot: "" }));
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Ange ett namn."); return; }
    setLoading(true); setError("");

    const payload = {
      name:         form.name,
      position:     form.position,
      adsense_slot: form.adsense_slot || null,
      image_url:    form.image_url    || null,
      link_url:     form.link_url     || null,
      is_active:    form.is_active,
    };

    if (editing) {
      await supabase.from("banners").update(payload).eq("id", editing.id);
      setSuccess("Bannern har uppdaterats.");
    } else {
      await supabase.from("banners").insert(payload);
      setSuccess("Bannern har lagts till.");
    }

    setCreating(false); setEditing(null); setForm(emptyForm()); setPreview("");
    load(); setLoading(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteBanner(id: string) {
    if (!confirm("Ta bort denna banner?")) return;
    await supabase.from("banners").delete().eq("id", id);
    load();
  }

  async function toggleActive(b: Banner) {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
  }

  const isFormOpen = creating || !!editing;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Banners</h1>
        <button onClick={startCreate} className="btn-primary text-sm">+ Ny banner</button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          ✅ {success}
        </div>
      )}

      {/* Formulär */}
      {isFormOpen && (
        <div className="card border-2 border-primary/20 space-y-4">
          <h2 className="font-bold text-lg">{editing ? "Redigera banner" : "Ny banner"}</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Namn (internt)</label>
              <input className="input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="t.ex. Sommarkampanj vänster" />
            </div>
            <div>
              <label className="label">Position</label>
              <select className="input" value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value as BannerPosition })}>
                {POSITIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bilduppladdning */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bild (egen annons)</p>

            <div className="flex items-start gap-4">
              {/* Förhandsgranskning */}
              <div className="w-28 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {preview ? (
                  <img src={preview} alt="Förhandsgranskning" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400 text-center px-2">Ingen bild vald</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary text-sm w-full"
                >
                  {uploading ? "Laddar upp..." : "📁 Välj bildfil"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {form.image_url && !uploading && (
                  <p className="text-xs text-green-600">✅ Bild uppladdad</p>
                )}
                <p className="text-xs text-gray-400">PNG, JPG, GIF eller WebP. Max 5 MB.</p>
              </div>
            </div>

            <div>
              <label className="label text-xs">Klicklänk (valfritt)</label>
              <input className="input text-sm" value={form.link_url}
                onChange={e => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://din-annonsör.se" />
            </div>
          </div>

          {/* AdSense */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Google AdSense <span className="normal-case font-normal text-gray-400">(när du fått godkänt)</span>
            </p>
            <input className="input text-sm" value={form.adsense_slot}
              onChange={e => setForm({ ...form, adsense_slot: e.target.value, image_url: e.target.value ? "" : form.image_url })}
              placeholder="AdSense Slot-ID, t.ex. 1234567890" />
            {form.adsense_slot && (
              <p className="text-xs text-amber-600">⚠️ AdSense-slot är ifyllt — bilden används inte.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-primary" />
            <label htmlFor="active" className="text-sm text-gray-700">Aktiv (visas på sidan)</label>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={loading || uploading || !form.name}
              className="btn-primary">
              {loading ? "Sparar..." : "Spara"}
            </button>
            <button onClick={() => { setCreating(false); setEditing(null); }}
              className="btn-secondary">Avbryt</button>
          </div>
        </div>
      )}

      {/* Bannerlista */}
      <div className="card">
        {banners.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Inga banners tillagda ännu.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map(b => {
              const posLabel = POSITIONS.find(p => p.value === b.position)?.label ?? b.position;
              return (
                <div key={b.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Miniatyrbild */}
                    {b.image_url && (
                      <img src={b.image_url} alt={b.name}
                        className="w-12 h-10 rounded object-cover border border-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {b.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                        <span className="text-xs border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                          {posLabel}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800 mt-0.5 truncate">{b.name}</p>
                      <p className="text-xs text-gray-400">
                        {b.adsense_slot
                          ? `AdSense: ${b.adsense_slot}`
                          : b.image_url
                          ? "Bildbanner"
                          : "Ingen källa konfigurerad"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(b)}
                      className={`text-xs px-2 py-1.5 rounded-lg border ${b.is_active ? "border-gray-200 text-gray-500 hover:bg-gray-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                      {b.is_active ? "Inaktivera" : "Aktivera"}
                    </button>
                    <button onClick={() => startEdit(b)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5">
                      Redigera
                    </button>
                    <button onClick={() => deleteBanner(b.id)}
                      className="text-xs px-2 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                      Ta bort
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info-ruta */}
      <div className="card bg-blue-50 border-blue-200 text-blue-800 text-xs space-y-1">
        <p className="font-semibold text-sm">💡 Tips</p>
        <p>Ladda upp egna bilder tills Google AdSense har godkänt dig. Byt sedan ut bilden mot ett AdSense Slot-ID — inga kodingrepp behövs.</p>
        <p>Optimal bannerstorlek: <strong>160 × 600 px</strong> (skyscraper) eller <strong>160 × 300 px</strong>.</p>
      </div>
    </div>
  );
}
