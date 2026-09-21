import type { Metadata } from "next";
import { AdminPriorityView } from "@/components/admin-priority-view";

export const metadata: Metadata = {
  title: "Prioritas Terdampak",
  description:
    "Peringkat risiko berdampingan dengan peringkat berbobot populasi dan kepadatan untuk membantu petugas menentukan wilayah yang perlu didahulukan.",
};

export default function AdminPrioritasPage() {
  return <AdminPriorityView />;
}
