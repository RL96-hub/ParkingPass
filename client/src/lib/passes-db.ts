import { supabase } from "@/lib/supabase";

export type VehicleSnapshot = {
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  nickname?: string;
};

export type PassRow = {
  id: string;
  unit_id: string;
  vehicle_id: string;
  vehicle_snapshot: VehicleSnapshot;

  created_at: string;   // ISO string
  expires_at: string;   // ISO string

  type: "free" | "paid" | "party";
  payment_status: "free" | "paid" | "payment_required" | "waived";
  price: number | null;
};

export async function getPassesByUnit(unitId: string) {
  const { data, error } = await supabase
    .from("passes")
    .select("*")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as PassRow[];
}

export async function hasActivePass(vehicleId: string) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("passes")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .gt("expires_at", nowIso)
    .limit(1);

  if (error) throw error;
  return (data || []).length > 0;
}

export async function countFreePassesThisMonth(unitId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("passes")
    .select("id")
    .eq("unit_id", unitId)
    .eq("type", "free")
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd);

  if (error) throw error;
  return (data || []).length;
}

export async function insertPass(payload: Omit<PassRow, "id">) {
  const { data, error } = await supabase
    .from("passes")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as PassRow;
}
