const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeftRight, Search } from "lucide-react";
import { muscleGroupLabels, muscleGroupColors, substitutionTypeLabels } from "@/lib/muscleGroups";

export default function Substitutions() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMain, setSelectedMain] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [subType, setSubType] = useState("equivalente");
  const [subNotes, setSubNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("name", 500),
  });

  const { data: substitutions = [], isLoading } = useQuery({
    queryKey: ["substitutions"],
    queryFn: () => db.entities.ExerciseSubstitution.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.ExerciseSubstitution.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["substitutions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ExerciseSubstitution.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["substitutions"] }),
  });

  const handleAdd = async () => {
    const mainEx = exercises.find(e => e.id === selectedMain);
    const subEx = exercises.find(e => e.id === selectedSub);
    if (!mainEx || !subEx) return;
    await createMutation.mutateAsync({
      main_exercise_id: mainEx.id,
      main_exercise_name: mainEx.name,
      substitute_exercise_id: subEx.id,
      substitute_exercise_name: subEx.name,
      substitution_type: subType,
      notes: subNotes,
    });
    setDialogOpen(false);
    setSelectedMain("");
    setSelectedSub("");
    setSubNotes("");
  };

  const activeExercises = exercises.filter(e => e.active !== false);

  // Group substitutions by main exercise
  const grouped = {};
  substitutions.forEach(sub => {
    const key = sub.main_exercise_id;
    if (!grouped[key]) grouped[key] = { name: sub.main_exercise_name, items: [] };
    grouped[key].items.push(sub);
  });

  const filteredGrouped = Object.entries(grouped).filter(([, g]) =>
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.items.some(i => i.substitute_exercise_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Substituições</h1>
          <p className="text-muted-foreground text-sm">{substitutions.length} substituições cadastradas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> Nova Substituição
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-6 h-24" /></Card>)}
        </div>
      ) : filteredGrouped.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <ArrowLeftRight className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma substituição cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGrouped.map(([mainId, group]) => {
            const mainEx = exercises.find(e => e.id === mainId);
            return (
              <Card key={mainId} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {group.name}
                    {mainEx && (
                      <Badge variant="secondary" className={`text-xs ${muscleGroupColors[mainEx.muscle_group] || ""}`}>
                        {muscleGroupLabels[mainEx.muscle_group] || mainEx.muscle_group}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.items.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-sm">{sub.substitute_exercise_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {substitutionTypeLabels[sub.substitution_type] || sub.substitution_type}
                        </Badge>
                        {sub.notes && <span className="text-xs text-muted-foreground">· {sub.notes}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => deleteMutation.mutate(sub.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Substituição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exercício Principal</Label>
              <Select value={selectedMain} onValueChange={setSelectedMain}>
                <SelectTrigger><SelectValue placeholder="Selecione o principal" /></SelectTrigger>
                <SelectContent>
                  {activeExercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exercício Substituto</Label>
              <Select value={selectedSub} onValueChange={setSelectedSub}>
                <SelectTrigger><SelectValue placeholder="Selecione o substituto" /></SelectTrigger>
                <SelectContent>
                  {activeExercises.filter(e => e.id !== selectedMain).map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Substituição</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(substitutionTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={subNotes} onChange={e => setSubNotes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!selectedMain || !selectedSub}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}