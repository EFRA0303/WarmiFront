"use client";

import Image from "next/image";
import { useState } from "react";
import { UserSettingsIcon } from "@/components/icons";

const agendaColors = ["#2DD4BF", "#38BDF8", "#A78BFA", "#F59E0B", "#F472B6", "#34D399", "#FB7185", "#818CF8"];

export function StaffVisualFields({
  initialColor = agendaColors[0],
  initialPhotoUrl,
  photoError: serverPhotoError,
  colorError,
}: {
  initialColor?: string;
  initialPhotoUrl?: string;
  photoError?: string;
  colorError?: string;
}) {
  const [agendaColor, setAgendaColor] = useState(initialColor.toUpperCase());
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl ?? null);
  const [photoError, setPhotoError] = useState("");

  function previewPhoto(file?: File) {
    setPhotoError("");
    if (!file) return setPhotoPreview(initialPhotoUrl ?? null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoPreview(initialPhotoUrl ?? null);
      return setPhotoError("La imagen no puede superar los 5 MB.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoPreview(initialPhotoUrl ?? null);
      return setPhotoError("Usa una imagen JPG, PNG o WEBP.");
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="staff-visual-fields">
      <label className="staff-photo-field">
        <span>Foto de perfil</span>
        <div className="staff-photo-field__content">
          <span className="staff-photo-preview">
            {photoPreview ? <Image src={photoPreview} alt="Vista previa de la foto" width={82} height={82} unoptimized /> : <UserSettingsIcon />}
          </span>
          <span className="staff-photo-copy">
            <strong>{initialPhotoUrl ? "Cambiar imagen" : "Seleccionar imagen"}</strong>
            <small>JPG, PNG o WEBP. Peso máximo 5 MB.</small>
          </span>
        </div>
        <input name="foto_perfil" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => previewPhoto(event.currentTarget.files?.[0])} />
        {(photoError || serverPhotoError) && <small className="staff-visual-error">{photoError || serverPhotoError}</small>}
      </label>
      <div className="staff-color-field">
        <span>Color para la agenda <b>*</b></span>
        <div className="staff-color-field__picker">
          <input name="color_agenda" type="color" value={agendaColor} onChange={(event) => setAgendaColor(event.target.value.toUpperCase())} aria-label="Elegir color para la agenda" />
          <strong>{agendaColor}</strong>
        </div>
        <div className="staff-color-options" aria-label="Colores sugeridos">
          {agendaColors.map((color) => <button key={color} type="button" className={agendaColor === color ? "selected" : ""} style={{ backgroundColor: color }} onClick={() => setAgendaColor(color)} aria-label={`Usar color ${color}`} />)}
        </div>
        <small>Este contorno identificará al profesional en la agenda.</small>
        {colorError && <small className="staff-visual-error">{colorError}</small>}
      </div>
    </div>
  );
}
