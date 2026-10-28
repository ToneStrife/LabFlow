import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PlusCircle, FlaskConical } from "lucide-react";
import { useLabs, useLabMembers, useSedes } from "@/hooks/use-labs";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import NewLabWizard from "@/components/NewLabWizard";
import SedeDot from "@/components/SedeDot";
import { cn } from "@/lib/utils";
import { mobileDialogClass } from "@/lib/layout";
import type { Lab } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";

const ROLE_LABEL: Record<string, string> = {
  member: "Miembro",
  admin_lab: "Admin lab",
  lab_order_manager: "Gestor pedidos",
};

const LabDetail: React.FC<{ lab: Lab }> = ({ lab }) => {
  const { data: members = [], isLoading: loadingMembers } = useLabMembers(lab.id);
  const { data: sedes = [] } = useSedes();
  const { data: profiles = [] } = useAllProfiles();
  const labSedes = sedes.filter((s) => s.lab_id === lab.id);

  return (
    <div className="space-y-3 border-t pt-3 text-sm">
      <div>
        <p className="mb-1 font-medium">Sedes</p>
        <div className="flex flex-wrap gap-2">
          {labSedes.map((s) => (
            <Badge key={s.id} variant="outline" className="gap-1.5">
              <SedeDot color={s.color} />
              {s.name}
              <span className="text-muted-foreground">· {s.tipo}</span>
            </Badge>
          ))}
          {!labSedes.length && <span className="text-muted-foreground">Sin sedes</span>}
        </div>
      </div>
      <div>
        <p className="mb-1 font-medium">Miembros</p>
        {loadingMembers ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ul className="space-y-1 text-muted-foreground">
            {members.map((m) => {
              const p = profiles.find((x) => x.id === m.user_id);
              return (
                <li key={`${m.lab_id}-${m.user_id}`}>
                  {getFullName(p) || m.user_id} — {ROLE_LABEL[m.role] || m.role}
                  {m.smtp_from ? ` · ${m.smtp_from}` : ""}
                </li>
              );
            })}
            {!members.length && <li>Sin miembros</li>}
          </ul>
        )}
      </div>
    </div>
  );
};

const LabsAdminSection: React.FC = () => {
  const { profile } = useSession();
  const puedeCrear = Boolean(profile?.is_owner);
  const { data: labs = [], isLoading, error } = useLabs();
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando laboratorios…
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Error: {error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <FlaskConical className="h-5 w-5" /> Laboratorios
          </CardTitle>
          {puedeCrear && (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nuevo laboratorio
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cada laboratorio es un grupo de investigación con sus sedes. FarBioQ sigue en
            lab-flow.es, con CIBM y Farmacia. Solo el propietario puede crear uno nuevo.
          </p>
          {labs.map((lab) => (
            <div key={lab.id} className="rounded-lg border p-4">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => setExpandedId((id) => (id === lab.id ? null : lab.id))}
              >
                <div>
                  <p className="font-semibold">{lab.name}</p>
                  <p className="text-xs text-muted-foreground">slug: {lab.slug}</p>
                  {lab.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{lab.description}</p>
                  )}
                </div>
                <Badge variant={lab.activo ? "secondary" : "outline"}>
                  {lab.activo ? "Activo" : "Inactivo"}
                </Badge>
              </button>
              {expandedId === lab.id && <LabDetail lab={lab} />}
            </div>
          ))}
          {!labs.length && (
            <p className="text-sm text-muted-foreground">Todavía no hay laboratorios.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={puedeCrear && wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>Nuevo laboratorio</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NewLabWizard
              onCancel={() => setWizardOpen(false)}
              onCreated={(labId) => {
                setWizardOpen(false);
                setExpandedId(labId);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabsAdminSection;
