"use client";

import Image from "next/image";
import { useState } from "react";

type CompanyLogoProps = {
  companyName: string;
};

export function CompanyLogo({ companyName }: CompanyLogoProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="login-company-logo">
      <Image
        src="/api/company-brand/logo"
        alt={`Logo de ${companyName}`}
        width={136}
        height={136}
        priority
        unoptimized
        onError={() => setVisible(false)}
      />
    </div>
  );
}
