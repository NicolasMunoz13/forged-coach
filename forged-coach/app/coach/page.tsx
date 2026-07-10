import { redirect } from "next/navigation";

// El Coach ya no vive en un iframe externo: ahora es parte de /evaluacion.
export default function CoachPage() {
  redirect("/evaluacion");
}
