import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ESTADOS_ACAO, ESTADO_GRUPOS, FORMATOS_ACAO, listaPaises } from "@/lib/acoes-opcoes";

export function EstadoPill({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const e = ESTADOS_ACAO.find((x) => x.value === value);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium",
        e?.tone ?? "bg-muted text-foreground",
      )}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

export function EstadoSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const legado = value && !ESTADOS_ACAO.some((e) => e.value === value);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Escolher estado" />
      </SelectTrigger>
      <SelectContent>
        {legado && (
          <SelectItem value={value}>
            <EstadoPill value={value} />
          </SelectItem>
        )}
        {ESTADO_GRUPOS.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel className="text-xs text-muted-foreground">{g}</SelectLabel>
            {ESTADOS_ACAO.filter((e) => e.grupo === g).map((e) => (
              <SelectItem key={e.value} value={e.value}>
                <EstadoPill value={e.value} />
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FormatoSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const legado = value && !(FORMATOS_ACAO as readonly string[]).includes(value);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Formato" />
      </SelectTrigger>
      <SelectContent>
        {legado && <SelectItem value={value}>{value}</SelectItem>}
        {FORMATOS_ACAO.map((f) => (
          <SelectItem key={f} value={f}>
            {f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PaisSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const paises = useMemo(() => listaPaises(), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">{value || "Escolher país"}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Procurar país…" />
          <CommandList>
            <CommandEmpty>Sem resultados.</CommandEmpty>
            {paises.map((p) => (
              <CommandItem
                key={p}
                value={p}
                onSelect={() => {
                  onChange(p);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-3.5 w-3.5", value === p ? "opacity-100" : "opacity-0")} />
                {p}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
