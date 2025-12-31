import { supabase } from "@/lib/supabase";

export type VehicleRow = {
  id: string;
  unit_id: string;
  license_plate: string;
  make: string;
  model: string;
  color: string;
  nickname: string | null;
};

export function normalizePlate(input: string) {
  // remove spaces + dashes + any non-alphanumeric, then uppercase
  return (input || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export async function getVehiclesByUnit(unitId: string) {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as VehicleRow[];
}
