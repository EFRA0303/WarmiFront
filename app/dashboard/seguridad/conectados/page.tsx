import { redirect } from "next/navigation";
import {
  UsersPresenceBoard,
  UsersPresenceProvider,
} from "@/components/users-presence";
import { getCurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/users";
import "../../people.css";
import "../security.css";
export default async function Page() {
  const [result, user] = await Promise.all([
    getUsers({ page: 1, limit: 100 }),
    getCurrentUser(),
  ]);
  if (!result.ok && result.status === 401) redirect("/login");
  if (!result.ok || !user?.permisos.includes("usuarios.leer")) return null;
  const initial = result.value.data.map((x) => ({
    id_usuario: x.id_usuario,
    en_linea: x.en_linea,
    ultima_actividad_en: x.ultima_actividad_en,
    ultima_desconexion_en: null,
  }));
  return (
    <section className="directory-page security-page">
      <header className="directory-heading">
        <div>
          <span className="page-eyebrow">SEGURIDAD</span>
          <h1>Usuarios conectados</h1>
          <p>Presencia actualizada automáticamente cada 15 segundos.</p>
        </div>
      </header>
      <UsersPresenceProvider
        initialUsers={initial}
        initialReferenceTime={new Date().toISOString()}
      >
        <UsersPresenceBoard users={result.value.data.map((x) => ({
          id_usuario: x.id_usuario,
          nombre: `${x.persona.nombre} ${x.persona.ap_paterno} ${x.persona.ap_materno || ""}`.trim(),
          rol: x.rol.nombre,
          correo: x.correo_acceso,
          foto_perfil_ruta: x.foto_perfil_ruta,
        }))} />
      </UsersPresenceProvider>
    </section>
  );
}
