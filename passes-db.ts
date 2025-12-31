import { supabase } from "@/lib/supabase";

export type PaymentStatus = "free" | "paid" | "payment_required" | "waived";
export type PassType = "free" | "paid" | "party";

export type PassRow = {
  id: string;
  unit_id: string;
  vehicle_id: string;
  vehicle_snapshot: {
    licensePlate: string;
    make: string;
    model: string;
    color: string;
    nickname?: string;
  };
  created_at: string;
  expires_at: string;
  type: PassType;
  payment_status: PaymentStatus;
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

export async function getAllPasses() {
  const { data, error } = await supabase
    .from("passes")
    .select("*")
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
  return (data?.length ?? 0) > 0;
}

export async function countFreePassesThisMonth(unitId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();

  const { data, error } = await supabase
    .from("passes")
    .select("id")
    .eq("unit_id", unitId)
    .eq("type", "free")
    .gte("created_at", monthStart)
    .lt("created_at", nextMonthStart);

  if (error) throw error;
  return data?.length ?? 0;
}

export async function insertPass(row: Omit<PassRow, "id">) {
  const { data, error } = await supabase
    .from("passes")
    .insert([row])
    .select("*")
    .single();

  if (error) throw error;
  return data as PassRow;
}

export async function updatePassPaymentStatus(passId: string, status: PaymentStatus) {
  const { data, error } = await supabase
    .from("passes")
    .update({ payment_status: status })
    .eq("id", passId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PassRow;
}
