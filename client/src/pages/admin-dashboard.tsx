import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download, Search, Check, X } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { api } from "@/lib/mock-data";
import { getAllPassesSupabase, updatePassPaymentStatusSupabase, PassRow } from "@/lib/passes-db";

type UIPass = {
  id: string;
  unitId: string;
  vehicleSnapshot: {
    licensePlate: string;
    make: string;
    model: string;
    color: string;
    nickname?: string | null;
  };
  createdAt: string;
  expiresAt: string;
  type: "free" | "paid" | "party";
  paymentStatus: "free" | "paid" | "payment_required" | "waived";
  price: number | null;
};

function toUIPass(p: PassRow): UIPass {
  return {
    id: p.id,
    unitId: p.unit_id,
    vehicleSnapshot: p.vehicle_snapshot,
    createdAt: p.created_at,
    expiresAt: p.expires_at,
    type: p.type,
    paymentStatus: p.payment_status,
    price: p.price ?? null,
  };
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ Passes from Supabase
  const { data: passesRaw, isLoading: passesLoading } = useQuery({
    queryKey: ["all-passes"],
    queryFn: getAllPassesSupabase,
  });

  const passes: UIPass[] = useMemo(() => (passesRaw ?? []).map(toUIPass), [passesRaw]);

  // Units still coming from your current API layer (whatever it is today)
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: api.getUnits,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "paid" | "waived" }) =>
      updatePassPaymentStatusSupabase(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-passes"] });
      toast({ title: "Status Updated" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Update Failed", description: err?.message ?? String(err) });
    },
  });

  const filteredPasses = useMemo(() => {
    return passes.filter((p) => {
      const unit = units?.find((u: any) => u.id === p.unitId);

      // Support both shapes: either unit.buildingNumber + unit.number, OR unit.building.number style
      const buildingNumber =
        unit?.buildingNumber ??
        unit?.building?.number ??
        unit?.building_number ??
        unit?.buildingNumber ??
        "";
      const unitNumber = unit?.number ?? unit?.unitNumber ?? unit?.unit_number ?? "";

      const unitStr = buildingNumber && unitNumber ? `${buildingNumber}-${unitNumber}` : "";

      const searchMatch =
        p.vehicleSnapshot.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vehicleSnapshot.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unitStr.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "all") return searchMatch;
      if (statusFilter === "active") return searchMatch && new Date(p.expiresAt) > new Date();
      if (statusFilter === "unpaid") return searchMatch && p.paymentStatus === "payment_required";

      return searchMatch;
    });
  }, [passes, units, searchTerm, statusFilter]);

  const activeCount = useMemo(
    () => passes.filter((p) => new Date(p.expiresAt) > new Date()).length,
    [passes]
  );
  const unpaidCount = useMemo(
    () => passes.filter((p) => p.paymentStatus === "payment_required").length,
    [passes]
  );

  const unitUsage = useMemo(() => {
    if (!units) return [];
    const usage = (units as any[]).map((u) => {
      const buildingNumber =
        u?.buildingNumber ?? u?.building?.number ?? u?.building_number ?? "";
      const name = buildingNumber ? `B${buildingNumber}-${u.number}` : `Unit-${u.number}`;
      const count = passes.filter((p) => p.unitId === u.id).length;
      return { name, count };
    });
    return usage.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [units, passes]);

  const handleExport = () => {
    const csv = [
      ["Pass ID", "Building", "Unit", "License Plate", "Make", "Created", "Expires", "Type", "Status"],
      ...passes.map((p) => {
        const u = units?.find((x: any) => x.id === p.unitId);

        const buildingNumber =
          u?.buildingNumber ?? u?.building?.number ?? u?.building_number ?? "Unknown";
        const unitNumber = u?.number ?? u?.unitNumber ?? u?.unit_number ?? "Unknown";

        return [
          p.id,
          buildingNumber,
          unitNumber,
          p.vehicleSnapshot.licensePlate,
          p.vehicleSnapshot.make,
          p.createdAt,
          p.expiresAt,
          p.type,
          p.paymentStatus,
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passes-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <Layout userType="admin" onLogout={() => setLocation("/")}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-display font-bold">Admin Overview</h1>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Passes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{unpaidCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Passes (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{passes.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search plate, unit (e.g. 1-101), or make..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Passes</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="unpaid">Unpaid Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {passesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredPasses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No passes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPasses.slice(0, 10).map((pass) => {
                      const u = units?.find((x: any) => x.id === pass.unitId);

                      const buildingNumber =
                        u?.buildingNumber ?? u?.building?.number ?? u?.building_number ?? "";
                      const unitNumber = u?.number ?? u?.unitNumber ?? u?.unit_number ?? "";

                      return (
                        <TableRow key={pass.id}>
                          <TableCell className="font-medium">
                            {buildingNumber && unitNumber ? `B${buildingNumber}-${unitNumber}` : "Unknown"}
                          </TableCell>

                          <TableCell>
                            <div className="font-mono">{pass.vehicleSnapshot.licensePlate}</div>
                            <div className="text-xs text-muted-foreground">{pass.vehicleSnapshot.make}</div>
                          </TableCell>

                          <TableCell>
                            {new Date(pass.expiresAt) > new Date() ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="outline">Expired</Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-xs">
                            {format(parseISO(pass.createdAt), "MM/dd HH:mm")}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {format(parseISO(pass.expiresAt), "MM/dd HH:mm")}
                          </TableCell>

                          <TableCell>
                            {pass.type === "free" ? (
                              <Badge variant="secondary">Free</Badge>
                            ) : pass.type === "party" ? (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                                Party
                              </Badge>
                            ) : (
                              <Badge variant={pass.paymentStatus === "paid" ? "default" : "destructive"}>
                                {pass.paymentStatus === "payment_required"
                                  ? `Due $${pass.price ?? ""}`
                                  : pass.paymentStatus}
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {pass.paymentStatus === "payment_required" && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-green-600"
                                  title="Mark Paid"
                                  onClick={() => updatePaymentMutation.mutate({ id: pass.id, status: "paid" })}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground"
                                  title="Waive"
                                  onClick={() => updatePaymentMutation.mutate({ id: pass.id, status: "waived" })}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Charts/Side */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Units (Usage)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitUsage} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
