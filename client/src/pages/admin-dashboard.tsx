// client/src/pages/admin-dashboard.tsx
import React, { useState } from "react";
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

// Units/buildings/settings are still coming from mock-data for now (that’s OK)
import { api } from "@/lib/mock-data";

// ✅ passes now come from Supabase
import {
  getAllPassesSupabase,
  updatePassPaymentStatusSupabase,
  PassRow,
} from "@/lib/passes-db";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ Supabase passes
  const { data: passes, isLoading } = useQuery({
    queryKey: ["all-passes"],
    queryFn: getAllPassesSupabase,
  });

  // still mock units
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
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message ?? "Could not update payment status.",
      });
    },
  });

  // Filter Logic
  const filteredPasses =
    passes?.filter((p: PassRow) => {
      const unit = units?.find((u: any) => u.id === p.unit_id);
      const unitStr = unit ? `${unit.buildingNumber}-${unit.number}` : "";

      const plate = p.vehicle_snapshot?.licensePlate ?? "";
      const make = p.vehicle_snapshot?.make ?? "";

      const searchMatch =
        plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unitStr.includes(searchTerm);

      if (statusFilter === "all") return searchMatch;
      if (statusFilter === "active") return searchMatch && new Date(p.expires_at) > new Date();
      if (statusFilter === "unpaid") return searchMatch && p.payment_status === "payment_required";

      return searchMatch;
    }) || [];

  // Stats
  const activeCount = passes?.filter((p) => new Date(p.expires_at) > new Date()).length || 0;
  const unpaidCount = passes?.filter((p) => p.payment_status === "payment_required").length || 0;

  const unitUsage =
    units
      ?.map((u: any) => ({
        name: `B${u.buildingNumber}-${u.number}`,
        count: passes?.filter((p) => p.unit_id === u.id).length || 0,
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5) || [];

  const handleExport = () => {
    if (!passes) return;

    const csv = [
      ["Pass ID", "Building", "Unit", "License Plate", "Make", "Created", "Expires", "Type", "Status"],
      ...passes.map((p) => {
        const u = units?.find((uu: any) => uu.id === p.unit_id);
        return [
          p.id,
          u?.buildingNumber || "Unknown",
          u?.number || "Unknown",
          p.vehicle_snapshot?.licensePlate ?? "",
          p.vehicle_snapshot?.make ?? "",
          p.created_at,
          p.expires_at,
          p.type,
          p.payment_status,
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
              <div className="text-3xl font-bold">{passes?.length || 0}</div>
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
                  {isLoading ? (
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
                      const u = units?.find((uu: any) => uu.id === pass.unit_id);
                      const plate = pass.vehicle_snapshot?.licensePlate ?? "";
                      const make = pass.vehicle_snapshot?.make ?? "";

                      return (
                        <TableRow key={pass.id}>
                          <TableCell className="font-medium">
                            {u ? `B${u.buildingNumber}-${u.number}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono">{plate}</div>
                            <div className="text-xs text-muted-foreground">{make}</div>
                          </TableCell>
                          <TableCell>
                            {new Date(pass.expires_at) > new Date() ? (
                              <Badge className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="outline">Expired</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(parseISO(pass.created_at), "MM/dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(parseISO(pass.expires_at), "MM/dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            {pass.type === "free" ? (
                              <Badge variant="secondary">Free</Badge>
                            ) : pass.type === "party" ? (
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                                Party
                              </Badge>
                            ) : (
                              <Badge
                                variant={pass.payment_status === "paid" ? "default" : "destructive"}
                              >
                                {pass.payment_status === "payment_required"
                                  ? `Due $${pass.price ?? ""}`
                                  : pass.payment_status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {pass.payment_status === "payment_required" && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-green-600"
                                  title="Mark Paid"
                                  onClick={() =>
                                    updatePaymentMutation.mutate({ id: pass.id, status: "paid" })
                                  }
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground"
                                  title="Waive"
                                  onClick={() =>
                                    updatePaymentMutation.mutate({ id: pass.id, status: "waived" })
                                  }
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
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
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
