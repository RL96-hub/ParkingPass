import { supabase } from "@/lib/supabase";

export type VehicleRow = {
  id: string;
  unit_id: string | null;

  // Legacy columns (if your table has them)
  building?: string | null;
  unit?: string | null;

  // Your current column name in Supabase
  licenseplate: string;

  make: string;
  model: string;
  color: string;
  nickname: string | null;

  created_at?: string | null;
};

export function normalizePlate(input: string) {
  // remove spaces + dashes + any non-alphanumeric, then uppercase
  return (input || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Migration-friendly fetch:
 * - New way: matches by unit_id
 * - Legacy way: matches by (building, unit)
 *
 * Pass buildingNumber + unitNumber if you still have legacy rows that were saved that way.
 */
export async function getVehiclesByUnit(
  unitId: string,
  buildingNumber?: string,
  unitNumber?: string
) {
  let q = supabase.from("vehicles").select("*");

  // If we have building+unit, include BOTH styles (unit_id OR (building+unit)).
  if (buildingNumber && unitNumber) {
    // Use .or() to combine the two conditions
    q = q.or(
      `unit_id.eq.${unitId},and(building.eq.${buildingNumber},unit.eq.${unitNumber})`
    );
  } else {
    // Otherwise, only unit_id
    q = q.eq("unit_id", unitId);
  }

  const { data, error } = await q.order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as VehicleRow[];
}
