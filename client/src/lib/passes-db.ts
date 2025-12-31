// client/src/lib/passes-db.ts
import { supabase } from "@/lib/supabase";

/**
 * IMPORTANT:
 * - This file must export: getPassesByUnit, insertPass, hasActivePass
 *   because resident-dashboard.tsx imports them.
 * - We also export admin helpers: getAllPassesSupabase, updatePassPaymentStatusSupabase
 */

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

  // Stored as JSON in Supabase
  vehicle_snapshot: VehicleSnapshot;

  created_at: string;
  expires_at: string;

  // app-level fields
  type: "free" | "paid" | "party";
  payment_status: "free" | "paid" | "payment_required" | "waived";
  price: number | null;
};

export type InsertPassInput = {
  unitId: string;
  vehicleId: string;
  vehicleSnapshot: VehicleSnapshot;
  expiresAt: string; // ISO string
  type: "free" | "paid" | "party";
  paymentStatus: "free" | "paid" | "payment_required" | "waived";
  price?: number | null;
};

/** Resident: list passes for unit */
export async function getPassesByUnit(unitId: string): Promise<PassRow[]> {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PassRow[];
}

/** Resident: insert pass */
export async function insertPass(input: InsertPassInput): Promise<PassRow> {
  const payload = {
    unit_id: input.unitId,
    vehicle_id: input.vehicleId,
    vehicle_snapshot: input.vehicleSnapshot,
    expires_at: input.expiresAt,
    type: input.type,
    payment_status: input.paymentStatus,
    price: input.price ?? null,
  };

  const { data, error } = await supabase
    .from("passes")
    .insert(payload)
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .single();

  if (error) throw error;
  return data as PassRow;
}

/** Resident: check active pass for a specific vehicle (or any vehicle) */
export async function hasActivePass(unitId: string, vehicleId?: string): Promise<boolean> {
  const nowIso = new Date().toISOString();

  let q = supabase
    .from("passes")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .gt("expires_at", nowIso);

  if (vehicleId) q = q.eq("vehicle_id", vehicleId);

  const { error, count } = await q;
  if (error) throw error;

  return (count ?? 0) > 0;
}

/** Admin: list all passes */
export async function getAllPassesSupabase(): Promise<PassRow[]> {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PassRow[];
}

/** Admin: update payment status */
export async function updatePassPaymentStatusSupabase(passId: string, status: "paid" | "waived") {
  const { error } = await supabase.from("passes").update({ payment_status: status }).eq("id", passId);
  if (error) throw error;
}
