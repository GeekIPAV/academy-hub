import { cn } from "@/lib/utils";

interface CoverImageProps {
  src: string;
  alt?: string;
  position?: string | null;
  scale?: number | null;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}

/**
 * Renders an image cropped to its container using object-cover,
 * applying a focal point (`object-position`) and an optional zoom level.
 *
 * Use this in place of <img className="object-cover" /> whenever the
 * source supports stored `cover_position` and `cover_scale` values.
 */
export function CoverImage({
  src,
  alt = "",
  position,
  scale,
  className,
  imgClassName,
  loading = "lazy",
}: CoverImageProps) {
  const pos = position && position.trim() ? position : "50% 50%";
  const sc = scale && scale > 1 ? scale : 1;
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={cn("h-full w-full object-cover", imgClassName, className)}
      style={{
        objectPosition: pos,
        transform: sc !== 1 ? `scale(${sc})` : undefined,
        transformOrigin: pos,
      }}
    />
  );
}
