import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useCreateLab, type CreateLabInput } from "@/hooks/use-labs";
import type { LabMemberRole, SedeTipo } from "@/data/types";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;

type MemberDraft = {
  user_id: string;
  role: LabMemberRole;
  smtp_from: string;
};

type SedeDraft = {
  key: string;
  id: string;
  name: string;
  tipo: SedeTipo;
  color: string;
  descripcion: string;
};

const ROLE_LABEL: Record<LabMemberRole, string> = {
  member: "Miembro",
  admin_lab: "Admin del lab",
  lab_order_manager: "Gestor de pedidos",
};

const SEDE_TEMPLATES: Record<string, SedeDraft[]> = {
  farmacia: [
    {
      key: "1",
      id: "",
      name: "Farmacia",
      tipo: "farmacia",
      color: "#9333ea",
      descripcion: "Facultad de Farmacia",
    },
  ],
  cibm_farmacia: [
    {
      key: "1",
      id: "",
      name: "CIBM",
      tipo: "cibm",
      color: "#2563eb",
      descripcion: "Centro de Investigación Biomédica",
    },
    {
      key: "2",
      id: "",
      name: "Farmacia",
      tipo: "farmacia",
      color: "#9333ea",
      descripcion: "Facultad de Farmacia",
    },
  ],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface NewLabWizardProps {
  onCreated?: (labId: string) => void;
  onCancel?: () => void;
}

const NewLabWizard: React.FC<NewLabWizardProps> = ({ onCreated, onCancel }) => {
  const { data: profiles = [], isLoading: loadingProfiles } = useAllProfiles();
  const createLab = useCreateLab();
  const [step, setStep] = React.useState<WizardStep>(1);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");

  const [members, setMembers] = React.useState<MemberDraft[]>([]);
  const [pickUserId, setPickUserId] = React.useState<string>("");
  const [pickRole, setPickRole] = React.useState<LabMemberRole>("member");

  const [sedes, setSedes] = React.useState<SedeDraft[]>(SEDE_TEMPLATES.farmacia);

  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const addMember = () => {
    if (!pickUserId) return;
    if (members.some((m) => m.user_id === pickUserId)) return;
    const profile = profiles.find((p) => p.id === pickUserId);
    setMembers((prev) => [
      ...prev,
      {
        user_id: pickUserId,
        role: pickRole,
        smtp_from: pickRole === "lab_order_manager" ? profile?.email ?? "" : "",
      },
    ]);
    setPickUserId("");
    setPickRole("member");
  };

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  const applyTemplate = (key: keyof typeof SEDE_TEMPLATES) => {
    setSedes(SEDE_TEMPLATES[key].map((s, i) => ({ ...s, key: String(i + 1) })));
  };

  const updateSede = (key: string, patch: Partial<SedeDraft>) => {
    setSedes((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const addSede = () => {
    setSedes((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        id: "",
        name: "Nueva sede",
        tipo: "otro",
        color: "#64748b",
        descripcion: "",
      },
    ]);
  };

  const removeSede = (key: string) => {
    setSedes((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
  };

  const canStep1 = name.trim().length > 0 && slug.trim().length > 0;
  const canStep3 = sedes.length >= 1 && sedes.every((s) => s.name.trim());

  const handleCreate = async () => {
    const payload: CreateLabInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      members: members.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        smtp_from: m.smtp_from.trim() || null,
      })),
      sedes: sedes.map((s) => ({
        id: s.id.trim() || undefined,
        name: s.name.trim(),
        tipo: s.tipo,
        color: s.color,
        descripcion: s.descripcion.trim() || null,
      })),
    };
    const lab = await createLab.mutateAsync(payload);
    onCreated?.(lab.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {([1, 2, 3, 4] as WizardStep[]).map((n) => (
          <Badge
            key={n}
            variant={step === n ? "default" : "outline"}
            className={cn(step > n && "border-green-600 text-green-700")}
          >
            {step > n ? <Check className="mr-1 h-3 w-3" /> : null}
            {n === 1 && "Datos"}
            {n === 2 && "Miembros"}
            {n === 3 && "Sedes"}
            {n === 4 && "Resumen"}
          </Badge>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lab-name">Nombre del laboratorio</Label>
            <Input
              id="lab-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. InmunoLab"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-slug">Slug (único)</Label>
            <Input
              id="lab-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="inmunolab"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-desc">Descripción (opcional)</Label>
            <Textarea
              id="lab-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-logo">URL del logo (opcional)</Label>
            <Input
              id="lab-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Asigna roles del laboratorio. El gestor de pedidos actúa casi como admin del lab
            (pedidos, correos, inventario) sin poder crear/borrar el laboratorio ni gestionar
            usuarios globales.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Persona</Label>
              <Select value={pickUserId || undefined} onValueChange={setPickUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProfiles ? "Cargando…" : "Buscar perfil"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {getFullName(p)} {p.email ? `· ${p.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-2 sm:w-48">
              <Label>Rol</Label>
              <Select value={pickRole} onValueChange={(v) => setPickRole(v as LabMemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as LabMemberRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={addMember} disabled={!pickUserId}>
              <Plus className="mr-1 h-4 w-4" /> Añadir
            </Button>
          </div>

          <ul className="divide-y rounded-lg border">
            {members.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">Sin miembros aún (opcional).</li>
            )}
            {members.map((m) => {
              const profile = profiles.find((p) => p.id === m.user_id);
              return (
                <li key={m.user_id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{getFullName(profile)}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {ROLE_LABEL[m.role]}
                    </Badge>
                  </div>
                  {m.role === "lab_order_manager" && (
                    <div className="w-full space-y-1 sm:w-56">
                      <Label className="text-xs">SMTP / From</Label>
                      <Input
                        value={m.smtp_from}
                        onChange={(e) =>
                          setMembers((prev) =>
                            prev.map((x) =>
                              x.user_id === m.user_id ? { ...x, smtp_from: e.target.value } : x
                            )
                          )
                        }
                        placeholder="gestor@ugr.es"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(m.user_id)}
                    aria-label="Quitar miembro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate("farmacia")}>
              Plantilla: Solo Farmacia
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate("cibm_farmacia")}
            >
              Plantilla: CIBM + Farmacia
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={addSede}>
              <Plus className="mr-1 h-4 w-4" /> Sede
            </Button>
          </div>
          <ul className="space-y-3">
            {sedes.map((s) => (
              <li key={s.key} className="space-y-2 rounded-lg border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nombre</Label>
                    <Input
                      value={s.name}
                      onChange={(e) => updateSede(s.key, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select
                      value={s.tipo}
                      onValueChange={(v) => updateSede(s.key, { tipo: v as SedeTipo })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmacia">Farmacia</SelectItem>
                        <SelectItem value="cibm">CIBM</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Id (opcional; vacío = slug-tipo)</Label>
                    <Input
                      value={s.id}
                      onChange={(e) => updateSede(s.key, { id: e.target.value })}
                      placeholder={`${slug || "lab"}-${s.tipo}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={s.color}
                      onChange={(e) => updateSede(s.key, { color: e.target.value })}
                      className="h-10 w-full"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Descripción</Label>
                  <Input
                    value={s.descripcion}
                    onChange={(e) => updateSede(s.key, { descripcion: e.target.value })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSede(s.key)}
                    disabled={sedes.length <= 1}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-muted-foreground">Slug: {slug}</p>
            {description && <p>{description}</p>}
          </div>
          <div>
            <p className="mb-1 font-medium">Miembros ({members.length})</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {members.length === 0 && <li>Ninguno</li>}
              {members.map((m) => {
                const p = profiles.find((x) => x.id === m.user_id);
                return (
                  <li key={m.user_id}>
                    {getFullName(p)} — {ROLE_LABEL[m.role]}
                    {m.smtp_from ? ` · From ${m.smtp_from}` : ""}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-1 font-medium">Sedes ({sedes.length})</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {sedes.map((s) => (
                <li key={s.key}>
                  {s.name} ({s.tipo}
                  {s.id ? ` · id ${s.id}` : ""})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <div>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={createLab.isPending}>
              Cancelar
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              disabled={createLab.isPending}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
            </Button>
          )}
          {step < 4 && (
            <Button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={(step === 1 && !canStep1) || (step === 3 && !canStep3)}
            >
              Siguiente <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button type="button" onClick={handleCreate} disabled={createLab.isPending || !canStep1 || !canStep3}>
              {createLab.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Crear laboratorio
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewLabWizard;
