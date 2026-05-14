import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getResourcesContext } from "@/lib/resources.functions";

let cached: boolean | null = null;

export function useIsFormando() {
  const fetchCtx = useServerFn(getResourcesContext);
  const [isFormando, setIsFormando] = useState<boolean | null>(cached);

  useEffect(() => {
    if (cached !== null) return;
    let mounted = true;
    fetchCtx()
      .then((r) => {
        cached = r.isFormando;
        if (mounted) setIsFormando(r.isFormando);
      })
      .catch(() => mounted && setIsFormando(false));
    return () => {
      mounted = false;
    };
  }, [fetchCtx]);

  return isFormando ?? false;
}
