import { supabase } from "@/lib/supabase";

export type VehicleRow = {
  id: string;
  building: string;
  unit: string;
  licenseplate: string;
  make: string;
  model: string;
  color: string;
  nickname: string | null;
  created_at?: string;
};

export function normalizePlate(input: string) {
  return (input || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Fetch vehicles for a resident using building + unit
 * (NO unit_id — matches your actual Supabase schema)
 */
export async function getVehiclesByUnit(
  _unitId: string, // kept only so existing calls don't break
  building?: string,
  unit?: string
): Promise<VehicleRow[]> {
  if (!building || !unit) {
    return [];
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("id, building, unit, licenseplate, make, model, color, nickname, created_at")
    .eq("building", building)
    .eq("unit", unit)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getVehiclesByUnit error:", error);
    throw error;
  }

  return data ?? [];
}
