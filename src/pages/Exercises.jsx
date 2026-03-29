const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Power, Dumbbell } from "lucide-react";
import { muscleGroupLabels, muscleGroupColors } from "@/lib/muscleGroups";
import ExerciseFormDialog from "@/components/exercises/ExerciseFormDialog";

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Exercise.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exercises"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Exercise.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exercises"] }),
  });

  const handleSave = async (form) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setEditing(null);
  };

  const toggleActive = async (ex) => {
    await updateMutation.mutateAsync({ id: ex.id, data: { active: !ex.active } });
  };

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name?.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === "all" || ex.muscle_group === filterGroup;
    return matchSearch && matchGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exercícios</h1>
          <p className="text-muted-foreground text-sm">{exercises.length} exercícios cadastrados</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> Novo Exercício
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="Grupo muscular" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {Object.entries(muscleGroupLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-4 h-16" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum exercício encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => (
            <Card key={ex.id} className={`border-0 shadow-sm transition-opacity ${ex.active === false ? "opacity-50" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{ex.name}</p>
                    <Badge variant="secondary" className={`text-xs ${muscleGroupColors[ex.muscle_group] || ""}`}>
                      {muscleGroupLabels[ex.muscle_group] || ex.muscle_group}
                    </Badge>
                    {ex.active === false && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ex.default_sets}x{ex.default_reps} · {ex.equipment || "—"} 
                    {ex.last_load ? ` · Última: ${ex.last_load}kg` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(ex); setDialogOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(ex)}>
                    <Power className={`w-4 h-4 ${ex.active !== false ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExerciseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exercise={editing}
        onSave={handleSave}
      />
    </div>
  );
}