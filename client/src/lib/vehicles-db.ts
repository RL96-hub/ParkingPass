import { supabase } from "@/lib/supabase";

export type VehicleRow = {
  id: string;

  // schema A
  unit_id?: string;

  // schema B
  building?: string;
  unit?: string;

  // common
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
 * Gets vehicles for the logged-in resident.
 * Supports BOTH schemas:
 *  A) vehicles.unit_id (uuid/string)
 *  B) vehicles.building + vehicles.unit (strings)
 */
export async function getVehiclesByUnit(unitId: string) {
  // 1) Try schema A: unit_id
  const resA = await supabase
    .from("vehicles")
    .select("id, unit_id, licenseplate, make, model, color, nickname, created_at")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  // If it worked, return it (even if empty)
  if (!resA.error) {
    return (resA.data || []) as VehicleRow[];
  }

  // If unit_id column doesn't exist, fall back
  const msg = (resA.error?.message || "").toLowerCase();
  const missingUnitId =
    msg.includes("column") && msg.includes("unit_id") && (msg.includes("does not exist") || msg.includes("not exist"));

  if (!missingUnitId) {
    // Some other error (RLS, permissions, etc.)
    throw resA.error;
  }

  // 2) Fallback schema B: building + unit from localStorage
  const building = localStorage.getItem("buildingNumber");
  const unit = localStorage.getItem("unitNumber");

  if (!building || !unit) {
    // Can't fallback without these
    throw resA.error;
  }

  const resB = await supabase
    .from("vehicles")
    .select("id, building, unit, licenseplate, make, model, color, nickname, created_at")
    .eq("building", building)
    .eq("unit", unit)
    .order("created_at", { ascending: false });

  if (resB.error) throw resB.error;
  return (resB.data || []) as VehicleRow[];
}
