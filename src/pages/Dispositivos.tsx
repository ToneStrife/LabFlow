"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bot, Link2, Loader2, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { pageContainerClass } from "@/lib/layout";
import { SEDES } from "@/lib/sedes";
import SedeDot from "@/components/SedeDot";
import { useSession } from "@/components/SessionContextProvider";
import {
  SofiaDevice,
  SofiaDeviceOpciones,
  useMySofiaDevices,
  useOtherSofiaDevices,
  usePairSofia,
  useRemoveSofia,
  useUpdateSofia,
} from "@/hooks/use-sofia-devices";

const AVATARES = [
  { id: 0, nombre: "Robot", img: "sofia/avatar-robot.png" },
  { id: 1, nombre: "Manga", img: "sofia/avatar-manga.png" },
  { id: 2, nombre: "Criatura", img: "sofia/avatar-criatura.png" },
  { id: 3, nombre: "Ninja", img: "sofia/avatar-ninja.png" },
];

// Voces de Gemini Live. Todas hablan español; el acento lo pone la instrucción de la placa.
const VOCES_FEMENINAS = [
  ["Kore", "firme y clara"],
  ["Leda", "joven"],
  ["Aoede", "suelta, natural"],
  ["Zephyr", "luminosa"],
  ["Sulafat", "cálida"],
  ["Achernar", "suave"],
  ["Despina", "fluida"],
  ["Vindemiatrix", "amable"],
  ["Gacrux", "madura"],
];
const VOCES_MASCULINAS = [
  ["Puck", "animada"],
  ["Charon", "informativa"],
  ["Orus", "firme"],
  ["Achird", "cercana"],
  ["Iapetus", "clara"],
  ["Algenib", "grave"],
];

const SIN_SEDE = "ninguna";

const assetUrl = (p: string) => `${import.meta.env.BASE_URL}${p}`;

const opcionesDe = (d: SofiaDevice): SofiaDeviceOpciones => ({
  nombre: d.nombre,
  propietario: d.propietario,
  avatar: d.avatar,
  voz: d.voz,
  volumen: d.volumen,
  protocolos_carpeta: d.protocolos_carpeta,
  sede_id: d.sede_id,
});

const ultimaConexion = (iso: string | null) =>
  iso ? `hace ${formatDistanceToNow(new Date(iso), { locale: es })}` : "todavía no se ha conectado";

// ------------------------------------------------------------------ emparejar
const Emparejar: React.FC<{ primera: boolean }> = ({ primera }) => {
  const [code, setCode] = React.useState("");
  const pair = usePairSofia();

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) return;
    try {
      await pair.mutateAsync(code);
      setCode("");
    } catch {
      /* el aviso ya lo da el hook */
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" /> {primera ? "Empareja tu Sofía" : "Emparejar otra Sofía"}
        </CardTitle>
        <CardDescription>
          Dile a la placa <span className="font-medium text-foreground">«Sophia, empareja con LabFlow»</span>.
          Te enseñará un código de 6 cifras durante 10 minutos: escríbelo aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <InputOTP maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} onComplete={() => undefined}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <Button type="submit" disabled={code.length !== 6 || pair.isPending}>
            {pair.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Emparejar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ una Sofía
const TarjetaSofia: React.FC<{ device: SofiaDevice }> = ({ device }) => {
  const [form, setForm] = React.useState<SofiaDeviceOpciones>(() => opcionesDe(device));
  const update = useUpdateSofia();
  const remove = useRemoveSofia();

  React.useEffect(() => setForm(opcionesDe(device)), [device]);

  const cambiado = JSON.stringify(form) !== JSON.stringify(opcionesDe(device));
  const set = <K extends keyof SofiaDeviceOpciones>(k: K, v: SofiaDeviceOpciones[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: device.id,
      data: {
        ...form,
        nombre: form.nombre.trim() || "Sofía",
        propietario: form.propietario?.trim() || null,
        protocolos_carpeta: form.protocolos_carpeta.trim() || "Protocolos Jarvis",
      },
    });
  };

  const avatar = AVATARES.find((a) => a.id === form.avatar) ?? AVATARES[1];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-[#dde0d2] p-1">
          <img src={assetUrl(avatar.img)} alt={avatar.nombre} className="h-full w-full object-contain [image-rendering:pixelated]" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-lg">{device.nombre}</CardTitle>
          <CardDescription className="mt-1 space-y-0.5 text-xs">
            <span className="block">Última conexión {ultimaConexion(device.last_seen_at)}</span>
            <span className="block font-mono">
              {device.hw_id}
              {device.firmware ? ` · ${device.firmware}` : ""}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={guardar} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`nombre-${device.id}`}>Nombre de la asistente</Label>
              <Input
                id={`nombre-${device.id}`}
                value={form.nombre}
                maxLength={20}
                onChange={(e) => set("nombre", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">La palabra para despertarla sigue siendo «Sophia».</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`prop-${device.id}`}>Cómo te llama</Label>
              <Input
                id={`prop-${device.id}`}
                value={form.propietario ?? ""}
                maxLength={30}
                placeholder="Tu nombre"
                onChange={(e) => set("propietario", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">También da nombre a tu libreta.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => set("avatar", a.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                    form.avatar === a.id ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"
                  )}
                >
                  <span className="flex aspect-square w-full items-center justify-center rounded bg-[#dde0d2] p-1">
                    <img src={assetUrl(a.img)} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
                  </span>
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Voz</Label>
              <Select value={form.voz} onValueChange={(v) => set("voz", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Femeninas</SelectLabel>
                    {VOCES_FEMENINAS.map(([v, d]) => (
                      <SelectItem key={v} value={v}>
                        {v} <span className="text-muted-foreground">· {d}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Masculinas</SelectLabel>
                    {VOCES_MASCULINAS.map(([v, d]) => (
                      <SelectItem key={v} value={v}>
                        {v} <span className="text-muted-foreground">· {d}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="h-4 w-4" /> Volumen inicial
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{form.volumen}</span>
              </Label>
              <Slider
                className="pt-2"
                min={10}
                max={100}
                step={5}
                value={[form.volumen]}
                onValueChange={([v]) => set("volumen", v)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`proto-${device.id}`}>Carpeta de protocolos (Drive)</Label>
              <Input
                id={`proto-${device.id}`}
                value={form.protocolos_carpeta}
                onChange={(e) => set("protocolos_carpeta", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nombre de la carpeta en el Drive del laboratorio.</p>
            </div>
            <div className="space-y-2">
              <Label>Sede</Label>
              <Select
                value={form.sede_id ?? SIN_SEDE}
                onValueChange={(v) => set("sede_id", v === SIN_SEDE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEDES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <SedeDot color={s.color} /> {s.name}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={SIN_SEDE}>Sin sede fija</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Decide a qué dirección van los pedidos que hagas por voz.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Desvincular
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Desvincular {device.nombre}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La placa dejará de poder hacer pedidos y de escribir en tu libreta hasta que la emparejes de
                    nuevo. Tus notas no se borran.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate(device.id)}>Desvincular</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" disabled={!cambiado || update.isPending}>
              {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ las de los demás (administración)
const OtrasSofias: React.FC = () => {
  const { data } = useOtherSofiaDevices(true);
  if (!data?.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Otras Sofías del laboratorio</CardTitle>
        <CardDescription>Solo lo ve administración. Cada persona cambia las opciones de la suya.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {data.map((d) => {
          const av = AVATARES.find((a) => a.id === d.avatar) ?? AVATARES[1];
          const dueno = [d.owner?.first_name, d.owner?.last_name].filter(Boolean).join(" ") || "Sin nombre";
          return (
            <div key={d.id} className="flex items-center gap-3 px-6 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-[#dde0d2] p-0.5">
                <img src={assetUrl(av.img)} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {d.nombre} <span className="font-normal text-muted-foreground">· de {dueno}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">Última conexión {ultimaConexion(d.last_seen_at)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// ------------------------------------------------------------------ página
const Dispositivos: React.FC = () => {
  const { data: devices, isLoading, error } = useMySofiaDevices();
  const { profile } = useSession();
  const veOtras = profile?.role === "Admin" || !!(profile as { is_owner?: boolean } | null)?.is_owner;

  return (
    <div className={cn(pageContainerClass, "max-w-3xl")}>
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="h-6 w-6" /> Mis Sofías
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu asistente de voz del laboratorio: su nombre, su voz y cómo hace los pedidos que le dictas.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            No se pudieron cargar tus dispositivos: {error.message}
          </CardContent>
        </Card>
      ) : (
        <>
          {devices?.map((d) => <TarjetaSofia key={d.id} device={d} />)}
          <Emparejar primera={!devices?.length} />
          {veOtras ? <OtrasSofias /> : null}
        </>
      )}
    </div>
  );
};

export default Dispositivos;
