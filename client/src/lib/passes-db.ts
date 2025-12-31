import { supabase } from "@/lib/supabase";

export type PassStatus = "active" | "expired";
export type PaymentStatus = "free" | "paid" | "payment_required" | "waived";

export type PassType = "free" | "paid" | "party";

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
  vehicle_snapshot: VehicleSnapshot | null;
  created_at: string;
  expires_at: string;
  type: PassType;
  payment_status: PaymentStatus;
  price: number | null;
};

// Helpers
function mapSnapshot(raw: any): VehicleSnapshot | null {
  if (!raw) return null;

  // If you stored JSON with camelCase keys
  if (raw.licensePlate) return raw as VehicleSnapshot;

  // If you stored JSON with snake_case keys (just in case)
  if (raw.license_plate) {
    return {
      licensePlate: raw.license_plate,
      make: raw.make,
      model: raw.model,
      color: raw.color,
      nickname: raw.nickname ?? null,
    };
  }

  return null;
}

export async function getAllPasses() {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    unit_id: p.unit_id,
    vehicle_id: p.vehicle_id,
    vehicle_snapshot: mapSnapshot(p.vehicle_snapshot),
    created_at: p.created_at,
    expires_at: p.expires_at,
    type: p.type,
    payment_status: p.payment_status,
    price: p.price,
  })) as PassRow[];
}

export async function getPassesByUnit(unitId: string) {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p: any) => ({
    id: p.id,
    unit_id: p.unit_id,
    vehicle_id: p.vehicle_id,
    vehicle_snapshot: mapSnapshot(p.vehicle_snapshot),
    created_at: p.created_at,
    expires_at: p.expires_at,
    type: p.type,
    payment_status: p.payment_status,
    price: p.price,
  })) as PassRow[];
}
