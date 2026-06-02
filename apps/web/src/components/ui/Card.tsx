import Image from "next/image";
import type { ReactNode } from "react";

export interface CardProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  imageHeight?: number;
  children?: ReactNode;
  className?: string;
}

export default function Card({
  title,
  description,
  image,
  imageAlt,
  imageHeight = 192,
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={[
        "bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden",
        "hover:shadow-xl transition-shadow duration-300",
        className,
      ].join(" ")}
    >
      {image && (
        <div className="relative" style={{ height: imageHeight }}>
          <Image
            src={image}
            alt={imageAlt || title || "Card image"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      )}
      {(title || description || children) && (
        <div className="p-5">
          {title && <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>}
          {description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
