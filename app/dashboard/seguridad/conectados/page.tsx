import { redirect } from "next/navigation";
import Image from "next/image";
import {
  UserPresenceStatus,
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
        <div className="presence-grid">
          {result.value.data.map((x) => {
            const full =
              `${x.persona.nombre} ${x.persona.ap_paterno} ${x.persona.ap_materno || ""}`.trim();
            return (
              <article className="presence-card" key={x.id_usuario}>
                {x.foto_perfil_ruta ? (
              <Image
                    src={`/api/users/${x.id_usuario}/profile-photo`}
                    alt=""
                width={46}
                height={46}
                unoptimized
                  />
                ) : (
                  <span className="presence-avatar">
                    {x.persona.nombre[0]}
                    {x.persona.ap_paterno[0]}
                  </span>
                )}
                <div>
                  <strong>{full}</strong>
                  <small>
                    {x.rol.nombre} · {x.correo_acceso}
                  </small>
                </div>
                <UserPresenceStatus userId={x.id_usuario} />
              </article>
            );
          })}
        </div>
      </UsersPresenceProvider>
    </section>
  );
}
