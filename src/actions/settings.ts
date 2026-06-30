"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { setExerciseSoundEnabled } from "@/lib/queries";

export async function updateExerciseSoundEnabled(enabled: boolean) {
  await requireAdmin();
  await setExerciseSoundEnabled(enabled);

  revalidatePath("/admin");
  revalidatePath("/gym", "layout");
}
