const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, ArrowLeft, Play } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { muscleGroupLabels, muscleGroupColors } from "@/lib/muscleGroups";

export default function PlanEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const planId = window.location.pathname.split("/plans/")[1];
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [itemForm, setItemForm] = useState({ planned_sets: 3, planned_reps: 12, planned_rest: 60, notes: "" });

  const { data: plan } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const plans = await db.entities.WorkoutPlan.filter({ id: planId });
      return plans[0];
    },
    enabled: !!planId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["plan-items", planId],
    queryFn: () => db.entities.WorkoutPlanItem.filter({ plan_id: planId }, "order"),
    enabled: !!planId,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("name", 500),
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => db.entities.WorkoutPlanItem.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-items", planId] }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.WorkoutPlanItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-items", planId] }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => db.entities.WorkoutPlanItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan-items", planId] }),
  });

  const handleAddItem = async () => {
    const ex = exercises.find(e => e.id === selectedExercise);
    if (!ex) return;
    await createItemMutation.mutateAsync({
      plan_id: planId,
      order: items.length + 1,
      exercise_id: ex.id,
      exercise_name: ex.name,
      planned_sets: itemForm.planned_sets,
      planned_reps: itemForm.planned_reps,
      planned_rest: itemForm.planned_rest,
      notes: itemForm.notes,
    });
    setDialogOpen(false);
    setSelectedExercise("");
    setItemForm({ planned_sets: 3, planned_reps: 12, planned_rest: 60, notes: "" });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i + 1) {
        await db.entities.WorkoutPlanItem.update(reordered[i].id, { order: i + 1 });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["plan-items", planId] });
  };

  const activeExercises = exercises.filter(e => e.active !== false);

  const handleSelectExercise = (exId) => {
    setSelectedExercise(exId);
    const ex = exercises.find(e => e.id === exId);
    if (ex) {
      setItemForm({
        planned_sets: ex.default_sets || 3,
        planned_reps: ex.default_reps || 12,
        planned_rest: ex.default_rest || 60,
        notes: "",
      });
    }
  };

  if (!plan) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/plans">
          <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          {plan.description && <p className="text-muted-foreground text-sm">{plan.description}</p>}
        </div>
        <Link to={`/execute/${planId}`}>
          <Button className="gap-2 rounded-xl"><Play className="w-4 h-4" /> Treinar</Button>
        </Link>
      </div>

      <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl w-full sm:w-auto">
        <Plus className="w-4 h-4" /> Adicionar Exercício
      </Button>

      {items.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum exercício na ficha. Adicione o primeiro!</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="plan-items">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {items.map((item, index) => {
                  const ex = exercises.find(e => e.id === item.exercise_id);
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}
                          className={`${snapshot.isDragging ? "opacity-80" : ""}`}>
                          <Card className="border-0 shadow-sm">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1">
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{item.exercise_name}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">
                                    {item.planned_sets}x{item.planned_reps} · {item.planned_rest}s
                                  </span>
                                  {ex && (
                                    <Badge variant="secondary" className={`text-xs ${muscleGroupColors[ex.muscle_group] || ""}`}>
                                      {muscleGroupLabels[ex.muscle_group]}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => deleteItemMutation.mutate(item.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Exercício</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exercício</Label>
              <Select value={selectedExercise} onValueChange={handleSelectExercise}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeExercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name} ({muscleGroupLabels[ex.muscle_group]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Séries</Label>
                <Input type="number" value={itemForm.planned_sets} onChange={e => setItemForm({ ...itemForm, planned_sets: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Reps</Label>
                <Input type="number" value={itemForm.planned_reps} onChange={e => setItemForm({ ...itemForm, planned_reps: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Descanso (s)</Label>
                <Input type="number" value={itemForm.planned_rest} onChange={e => setItemForm({ ...itemForm, planned_rest: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={!selectedExercise}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}