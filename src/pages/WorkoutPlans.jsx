const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Play, Copy, ClipboardList, Power, Trash2 } from "lucide-react";

export default function WorkoutPlans() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", active: true });
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => db.entities.WorkoutPlan.list("-created_date", 100),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["workout-plan-items-all"],
    queryFn: () => db.entities.WorkoutPlanItem.list("order", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.WorkoutPlan.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout-plans"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.WorkoutPlan.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout-plans"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.WorkoutPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workout-plans"] }),
  });

  const duplicatePlan = async (plan) => {
    const newPlan = await db.entities.WorkoutPlan.create({
      name: `${plan.name} (cópia)`,
      description: plan.description,
      active: true,
    });
    const items = allItems.filter(i => i.plan_id === plan.id);
    for (const item of items) {
      await db.entities.WorkoutPlanItem.create({
        plan_id: newPlan.id,
        order: item.order,
        exercise_id: item.exercise_id,
        exercise_name: item.exercise_name,
        planned_sets: item.planned_sets,
        planned_reps: item.planned_reps,
        planned_rest: item.planned_rest,
        notes: item.notes,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    queryClient.invalidateQueries({ queryKey: ["workout-plan-items-all"] });
  };

  const handleSave = async () => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({ name: plan.name, description: plan.description || "", active: plan.active !== false });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", active: true });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fichas de Treino</h1>
          <p className="text-muted-foreground text-sm">{plans.length} fichas cadastradas</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> Nova Ficha
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array(4).fill(0).map((_, i) => <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-6 h-32" /></Card>)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma ficha criada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map(plan => {
            const itemCount = allItems.filter(i => i.plan_id === plan.id).length;
            return (
              <Card key={plan.id} className={`border-0 shadow-sm transition-opacity ${plan.active === false ? "opacity-50" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {plan.name}
                        {plan.active === false && <Badge variant="outline" className="text-xs">Inativa</Badge>}
                      </CardTitle>
                      {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{itemCount} exercício{itemCount !== 1 ? "s" : ""}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/execute/${plan.id}`}>
                      <Button size="sm" className="gap-1.5 rounded-lg"><Play className="w-3.5 h-3.5" />Treinar</Button>
                    </Link>
                    <Link to={`/plans/${plan.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg"><Pencil className="w-3.5 h-3.5" />Editar</Button>
                    </Link>
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => duplicatePlan(plan)}>
                      <Copy className="w-3.5 h-3.5" />Duplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 rounded-lg" onClick={() => updateMutation.mutate({ id: plan.id, data: { active: !plan.active } })}>
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 rounded-lg text-destructive" onClick={() => deleteMutation.mutate(plan.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Ficha" : "Nova Ficha"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Treino A - Peito/Tríceps" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Ficha ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}