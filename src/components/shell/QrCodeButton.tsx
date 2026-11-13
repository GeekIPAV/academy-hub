import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Botão que mostra o código QR de um link, para projetar ou imprimir no fim de uma sessão. */
export function QrCodeButton({
  url,
  titulo,
  ficheiro,
  comTexto = false,
}: {
  url: string;
  titulo: string;
  ficheiro: string;
  comTexto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#193B69", light: "#FFFFFF" } })
      .then((d: string) => {
        if (vivo) setImg(d);
      })
      .catch(() => setImg(null));
    return () => {
      vivo = false;
    };
  }, [aberto, url]);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={comTexto ? "sm" : "icon"}
          variant="outline"
          aria-label={comTexto ? undefined : `Código QR de ${titulo}`}
        >
          <QrCode className={comTexto ? "mr-1.5 h-4 w-4" : "h-4 w-4"} />
          {comTexto && "Código QR"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Mostra este código no fim da sessão para as pessoas abrirem o link no telemóvel.</DialogDescription>
        </DialogHeader>
        <div className="flex aspect-square items-center justify-center rounded-xl border bg-white p-3">
          {img ? <img src={img} alt={`Código QR para ${url}`} className="h-full w-full" /> : null}
        </div>
        <p className="break-all text-center font-mono text-xs text-muted-foreground">{url}</p>
        {img && (
          <Button asChild variant="outline" className="w-full">
            <a href={img} download={`${ficheiro}.png`}>
              <Download className="mr-1.5 h-4 w-4" />
              Descarregar imagem
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
