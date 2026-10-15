"use client";

import Image from "next/image";
import { useState } from "react";

export function CurrentUserAvatar({
  hasPhoto,
  photoKey,
  initials,
  className,
  size = 40,
}: {
  hasPhoto: boolean;
  photoKey?: string | null;
  initials: string;
  className: string;
  size?: number;
}) {
  const currentPhotoKey = photoKey || "current-photo";
  const [failedPhotoKey, setFailedPhotoKey] = useState<string | null>(null);
  const available = hasPhoto && failedPhotoKey !== currentPhotoKey;

  return (
    <span className={className}>
      {available ? (
        <Image
          src="/api/account/profile-photo"
          alt="Foto de perfil"
          width={size}
          height={size}
          unoptimized
          onError={() => setFailedPhotoKey(currentPhotoKey)}
        />
      ) : (
        initials || "WU"
      )}
    </span>
  );
}
