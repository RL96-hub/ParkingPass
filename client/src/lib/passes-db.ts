// client/src/lib/passes-db.ts
import { supabase } from "@/lib/supabase";

export type VehicleSnapshot = {
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  nickname?: string | null;
};

export type PassRow = {
  id: string;
  unit_id: string;
  vehicle_id: string;
  vehicle_snapshot: VehicleSnapshot;
  created_at: string;
  expires_at: string;
  type: "free" | "paid" | "party";
  payment_status: "free" | "paid" | "payment_required" | "waived";
  price: number | null;
};

export async function getAllPassesSupabase(): Promise<PassRow[]> {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // NOTE: assumes vehicle_snapshot is stored as JSON with camelCase keys (licensePlate, etc.)
  return (data ?? []) as PassRow[];
}

export async function updatePassPaymentStatusSupabase(
  passId: string,
  status: "paid" | "waived"
) {
  const { error } = await supabase
    .from("passes")
    .update({ payment_status: status })
    .eq("id", passId);

  if (error) throw error;
}
