"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HistoryIcon } from "@/components/icons";
import { openPatientHistory } from "@/app/dashboard/historiales/actions";
export function PatientHistoryAction({ patientId, historyId, patientName, canCreate }: { patientId: number; historyId?: number | null; patientName: string; canCreate: boolean }) {
  const router = useRouter(); const [pending, transition] = useTransition(); const [error, setError] = useState("");
  if (historyId) return <Link href={`/dashboard/historiales/${historyId}`} title="Abrir historial clínico" aria-label={`Abrir historial clínico de ${patientName}`}><HistoryIcon /></Link>;
  if (!canCreate) return null;
  return <><button type="button" disabled={pending} title="Abrir historial clínico" aria-label={`Abrir historial clínico de ${patientName}`} onClick={() => transition(async () => { setError(""); const result = await openPatientHistory(patientId); if (result.ok && result.id) router.push(`/dashboard/historiales/${result.id}`); else setError(result.message || "No se pudo abrir el historial."); })}><HistoryIcon /></button>{error && <span className="patient-history-error" role="alert">{error}</span>}</>;
}
