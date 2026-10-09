"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Bot, CheckCircle2, Clock, KeyRound, Link2, Loader2, Plus, Trash2, Volume2, Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useSetSofiaSecrets,
  useSofiaSecretInfo,
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
  wake_umbral: d.wake_umbral ?? null,
  voz_minima: d.voz_minima ?? null,
  fin_frase_ms: d.fin_frase_ms ?? null,
  seguir_ms: d.seguir_ms ?? null,
  cierre_hora: d.cierre_hora ?? null,
  silencio_min: d.silencio_min ?? null,
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
type Valor = number | null;

/** Un ajuste numérico que puede quedarse en «el de la placa» (null) */
const AjusteSlider: React.FC<{
  id: string;
  label: string;
  ayuda: string;
  value: Valor;
  porDefecto: number;
  min: number;
  max: number;
  step: number;
  formato: (v: number) => string;
  onChange: (v: Valor) => void;
}> = ({ id, label, ayuda, value, porDefecto, min, max, step, formato, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <span className="flex items-center gap-2 text-xs">
        <span className={cn("font-mono tabular-nums", value === null && "text-muted-foreground")}>
          {formato(value ?? porDefecto)}
          {value === null ? " (de la placa)" : ""}
        </span>
        {value !== null ? (
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => onChange(null)}>
            Restablecer
          </button>
        ) : null}
      </span>
    </div>
    <Slider
      id={id}
      min={min}
      max={max}
      step={step}
      value={[value ?? porDefecto]}
      onValueChange={([v]) => onChange(v)}
      className={cn(value === null && "opacity-60")}
    />
    <p className="text-xs text-muted-foreground">{ayuda}</p>
  </div>
);

// Sensibilidad 1-9 en la página; en la placa es un umbral (más bajo = más sensible)
const sensDeUmbral = (u: number) => Math.min(9, Math.max(1, Math.round((0.8 - u) / 0.05)));
const umbralDeSens = (s: number) => Math.round((0.8 - s * 0.05) * 100) / 100;

const EstadoPlaca: React.FC<{ device: SofiaDevice }> = ({ device }) => {
  const alDia = (device.applied_rev ?? 0) >= device.config_rev;
  const avisos = device.estado?.avisos ?? [];
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
          alDia ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
        )}
      >
        {alDia ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : (
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        )}
        <span>
          {alDia
            ? `La placa tiene estos ajustes${device.estado?.aplicado_at ? ` (aplicados ${ultimaConexion(device.estado.aplicado_at)})` : ""}.`
            : "Cambios pendientes: la placa los coge en unos minutos, o al momento si le dices «actualiza la configuración»."}
        </span>
      </div>
      {avisos.map((a) => (
        <div key={a} className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <span>{a}</span>
        </div>
      ))}
    </div>
  );
};

// Clave de Gemini y redes extra: van aparte y nunca vuelven a la página
const ClavesYRedes: React.FC<{ device: SofiaDevice }> = ({ device }) => {
  const { data: info, isLoading } = useSofiaSecretInfo(device.id);
  const setSecrets = useSetSofiaSecrets();
  const [clave, setClave] = React.useState("");
  const [redes, setRedes] = React.useState<{ ssid: string; pass: string; nueva: boolean }[]>([]);

  React.useEffect(() => {
    if (info) setRedes(info.wifi.map((ssid) => ({ ssid, pass: "", nueva: false })));
  }, [info]);

  if (isLoading) return <Loader2 className="mx-auto h-5 w-5 animate-spin" />;

  const guardarRedes = () =>
    setSecrets.mutate({
      deviceId: device.id,
      wifi: redes
        .filter((r) => r.ssid.trim())
        .map((r) => (r.nueva || r.pass ? { ssid: r.ssid.trim(), pass: r.pass } : { ssid: r.ssid.trim() })),
    });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={`gem-${device.id}`} className="flex items-center gap-1.5">
          <KeyRound className="h-4 w-4" /> Clave de Gemini
        </Label>
        <p className="text-xs text-muted-foreground">
          {info?.gemini
            ? `Usa una clave propia (termina en ${info.gemini_fin ?? "…"}).`
            : "Usa la clave que lleva la placa (secrets.h)."}{" "}
          Con una clave propia, el uso cuenta en tu cupo de Google AI Studio. La clave no se puede volver a ver desde aquí.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`gem-${device.id}`}
            type="password"
            autoComplete="off"
            placeholder={info?.gemini ? "Escribe otra para cambiarla" : "Pega aquí tu clave (AIza…)"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          <Button
            type="button"
            disabled={!clave.trim() || setSecrets.isPending}
            onClick={() => setSecrets.mutate({ deviceId: device.id, gemini: clave }, { onSuccess: () => setClave("") })}
          >
            Guardar clave
          </Button>
          {info?.gemini ? (
            <Button type="button" variant="outline" disabled={setSecrets.isPending} onClick={() => setSecrets.mutate({ deviceId: device.id, gemini: "" })}>
              Quitar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Wifi className="h-4 w-4" /> Redes WiFi extra
        </Label>
        <p className="text-xs text-muted-foreground">
          Hasta 3, además de la de secrets.h. Se usan desde el siguiente reinicio de la placa. Las redes con usuario y
          contraseña (como eduroam) no sirven: usa una red con contraseña normal o el móvil.
        </p>
        {redes.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nombre de la red"
              value={r.ssid}
              maxLength={32}
              disabled={!r.nueva}
              onChange={(e) => setRedes((rs) => rs.map((x, k) => (k === i ? { ...x, ssid: e.target.value } : x)))}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={r.nueva ? "Contraseña" : "Contraseña (sin cambios)"}
              value={r.pass}
              maxLength={63}
              onChange={(e) => setRedes((rs) => rs.map((x, k) => (k === i ? { ...x, pass: e.target.value } : x)))}
            />
            <Button type="button" variant="ghost" size="icon" aria-label="Quitar red" onClick={() => setRedes((rs) => rs.filter((_, k) => k !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          {redes.length < 3 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setRedes((rs) => [...rs, { ssid: "", pass: "", nueva: true }])}>
              <Plus className="mr-1 h-4 w-4" /> Añadir red
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={setSecrets.isPending} onClick={guardarRedes}>
            Guardar redes
          </Button>
        </div>
      </div>
    </div>
  );
};

const TarjetaSofia: React.FC<{ device: SofiaDevice }> = ({ device }) => {
  const [form, setForm] = React.useState<SofiaDeviceOpciones>(() => opcionesDe(device));
  const update = useUpdateSofia();
  const remove = useRemoveSofia();

  const base = React.useMemo(() => JSON.stringify(opcionesDe(device)), [device]);
  React.useEffect(() => setForm(JSON.parse(base)), [base]);

  const cambiado = JSON.stringify(form) !== base;
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
  const placa = device.estado?.placa ?? {};
  const pie = (
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
              La placa dejará de poder hacer pedidos y de escribir en tu libreta hasta que la emparejes de nuevo. Tus notas no se borran.
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
  );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-[#dde0d2] p-1">
            <img src={assetUrl(avatar.img)} alt={avatar.nombre} className="h-full w-full object-contain [image-rendering:pixelated]" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{device.nombre}</CardTitle>
            <CardDescription className="mt-1 space-y-0.5 text-xs">
              <span className="block">
                Última conexión {ultimaConexion(device.last_seen_at)}
                {device.estado?.red ? ` · red ${device.estado.red}` : ""}
              </span>
              <span className="block font-mono">
                {device.hw_id}
                {device.firmware ? ` · ${device.firmware}` : ""}
              </span>
            </CardDescription>
          </div>
        </div>
        <EstadoPlaca device={device} />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="escucha">Escucha</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="claves">Claves</TabsTrigger>
          </TabsList>

          <form onSubmit={guardar}>
            <TabsContent value="general" className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`nombre-${device.id}`}>Nombre de la asistente</Label>
                  <Input id={`nombre-${device.id}`} value={form.nombre} maxLength={20} onChange={(e) => set("nombre", e.target.value)} />
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
                  <Slider className="pt-2" min={10} max={100} step={5} value={[form.volumen]} onValueChange={([v]) => set("volumen", v)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`proto-${device.id}`}>Carpeta de protocolos (Drive)</Label>
                  <Input id={`proto-${device.id}`} value={form.protocolos_carpeta} onChange={(e) => set("protocolos_carpeta", e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Nombre exacto de la carpeta en el Drive del laboratorio. La placa comprueba que existe antes de cambiarla; si no, sigue con
                    la anterior y te avisa aquí arriba.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Sede</Label>
                  <Select value={form.sede_id ?? SIN_SEDE} onValueChange={(v) => set("sede_id", v === SIN_SEDE ? null : v)}>
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
              {pie}
            </TabsContent>

            <TabsContent value="escucha" className="space-y-6">
              <AjusteSlider
                id={`sens-${device.id}`}
                label="Sensibilidad de «Sophia»"
                ayuda="Más alta: te oye mejor de lejos o hablando bajo, pero salta más sin querer. Bájala si se activa sola."
                value={form.wake_umbral === null ? null : sensDeUmbral(form.wake_umbral)}
                porDefecto={sensDeUmbral(placa.umbral ?? 0.4)}
                min={1}
                max={9}
                step={1}
                formato={(v) => `${v} de 9`}
                onChange={(v) => set("wake_umbral", v === null ? null : umbralDeSens(v))}
              />
              <AjusteSlider
                id={`vad-${device.id}`}
                label="Nivel mínimo de voz"
                ayuda="Súbelo si el ruido del laboratorio (campana, centrífuga) la hace creer que hablas; bájalo si corta tus frases al hablar bajo."
                value={form.voz_minima}
                porDefecto={placa.voz_minima ?? 700}
                min={300}
                max={2000}
                step={50}
                formato={(v) => String(v)}
                onChange={(v) => set("voz_minima", v)}
              />
              <AjusteSlider
                id={`fin-${device.id}`}
                label="Silencio para acabar la frase"
                ayuda="Cuánto espera callada antes de dar por terminada tu petición. Súbelo si te corta cuando haces pausas."
                value={form.fin_frase_ms}
                porDefecto={placa.fin_frase_ms ?? 1500}
                min={800}
                max={3000}
                step={100}
                formato={(v) => `${(v / 1000).toFixed(1).replace(".", ",")} s`}
                onChange={(v) => set("fin_frase_ms", v)}
              />
              <AjusteSlider
                id={`seg-${device.id}`}
                label="Seguir hablando sin repetir «Sophia»"
                ayuda="Después de contestar, tiempo en que puedes volver a hablarle directamente. 0 = siempre hay que decir «Sophia»."
                value={form.seguir_ms}
                porDefecto={placa.seguir_ms ?? 6000}
                min={0}
                max={15000}
                step={1000}
                formato={(v) => (v === 0 ? "no" : `${v / 1000} s`)}
                onChange={(v) => set("seguir_ms", v)}
              />
              {pie}
            </TabsContent>

            <TabsContent value="horarios" className="space-y-6">
              <div className="space-y-2">
                <Label>Cierre del día automático</Label>
                <Select
                  value={form.cierre_hora === null ? "placa" : String(form.cierre_hora)}
                  onValueChange={(v) => set("cierre_hora", v === "placa" ? null : Number(v))}
                >
                  <SelectTrigger className="sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placa">
                      El de la placa ({(placa.cierre_hora ?? 23) >= 24 ? "nunca" : `${placa.cierre_hora ?? 23}:00`})
                    </SelectItem>
                    {[17, 18, 19, 20, 21, 22, 23].map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        A partir de las {h}:00
                      </SelectItem>
                    ))}
                    <SelectItem value="24">Nunca</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A partir de esa hora, si llevas un rato sin hablarle, resume tu día en la libreta.
                </p>
              </div>
              <AjusteSlider
                id={`sil-${device.id}`}
                label="Modo silencio"
                ayuda="Minutos que deja de escuchar cuando la mandas callar o mantienes BOOT (0 = hasta que lo quites tú)."
                value={form.silencio_min}
                porDefecto={placa.silencio_min ?? 30}
                min={0}
                max={180}
                step={5}
                formato={(v) => (v === 0 ? "hasta quitarlo" : `${v} min`)}
                onChange={(v) => set("silencio_min", v)}
              />
              {pie}
            </TabsContent>
          </form>

          <TabsContent value="claves">
            <ClavesYRedes device={device} />
          </TabsContent>
        </Tabs>
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
