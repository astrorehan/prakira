import { redirect } from "next/navigation";

/**
 * Pertahankan bookmark lama tanpa mempertahankan halaman publiknya. Matriks
 * prioritas sekarang berada di konsol administrator dan akan meminta sesi di
 * `/admin/prioritas`.
 */
export default function PrioritasRedirect() {
  redirect("/admin/prioritas");
}
