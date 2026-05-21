import mandelaImg from "@/assets/loading-mandela.png";

export function LoadingU() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="loading-mandela-wrap">
        <img
          src={mandelaImg}
          alt=""
          aria-hidden="true"
          className="loading-mandela-img"
        />
        <span className="loading-mandela-line" aria-hidden="true" />
      </div>
      <div className="text-sm text-muted-foreground">A carregar…</div>
    </div>
  );
}
