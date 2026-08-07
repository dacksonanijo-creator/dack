import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/taskora/admin-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";

export const Route = createFileRoute("/admin/branding")({
  head: () => ({
    meta: [
      { title: "Logótipo oficial — Admin Taskora" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Publicar e gerir o logótipo oficial da Taskora." },
    ],
  }),
  component: Page,
});

const MAX_BYTES = 400 * 1024;
const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.readAsDataURL(file);
  });
}

function LogoSlot({
  title,
  hint,
  value,
  dark,
  onChange,
}: {
  title: string;
  hint: string;
  value: string | null;
  dark?: boolean;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Formato inválido. Usa PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ficheiro demasiado grande. Máximo 400 KB.");
      return;
    }
    onChange(await readAsDataUrl(file));
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      <div
        className={
          "mt-3 grid h-32 place-items-center rounded-lg border border-dashed border-border p-3 " +
          (dark ? "bg-slate-900" : "bg-muted/30")
        }
      >
        {value ? (
          <img src={value} alt={title} className="h-full w-auto max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Sem logótipo</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <ImageUp className="mr-2 h-4 w-4" />
          Escolher imagem
        </Button>
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onChange(null)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

function Page() {
  const branding = useBranding();
  const [light, setLight] = useState<string | null>(null);
  const [dark, setDark] = useState<string | null>(null);
  const [wordmark, setWordmark] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding.loading) return;
    setLight(branding.logoLight);
    setDark(branding.logoDark);
    setWordmark(branding.showWordmark);
  }, [branding.loading, branding.logoLight, branding.logoDark, branding.showWordmark]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_branding")
      .update({
        logo_light_url: light,
        logo_dark_url: dark,
        show_wordmark: wordmark,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível publicar o logótipo.", { description: error.message });
      return;
    }
    await branding.refresh();
    toast.success("Logótipo publicado com sucesso.");
  };

  return (
    <div>
      <AdminPageHeader
        title="Logótipo oficial"
        description="Publica o logótipo da Taskora. É aplicado imediatamente em toda a plataforma."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <LogoSlot
          title="Logótipo — tema claro"
          hint="Usado em fundos claros. PNG, JPG, SVG ou WebP até 400 KB."
          value={light}
          onChange={setLight}
        />
        <LogoSlot
          title="Logótipo — tema escuro"
          hint="Opcional. Se vazio, é usado o do tema claro."
          value={dark}
          dark
          onChange={setDark}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Mostrar o nome “Taskora”</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Desliga se o teu logótipo já incluir o nome da marca.
          </p>
        </div>
        <Switch checked={wordmark} onCheckedChange={setWordmark} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving || branding.loading}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publicar logótipo
        </Button>
      </div>
    </div>
  );
}
