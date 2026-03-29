const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History as HistoryIcon, Calendar, Dumbbell, ChevronRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExerciseHistory from "@/components/history/ExerciseHistory";

export default function History() {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterExercise, setFilterExercise] = useState("all");
  const [showExerciseHistory, setShowExerciseHistory] = useState(null);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["completed-workouts"],
    queryFn: () => db.entities.CompletedWorkout.list("-workout_date", 200),
  });

  const { data: workoutItems = [] } = useQuery({
    queryKey: ["completed-workout-items"],
    queryFn: () => db.entities.CompletedWorkoutItem.list("-created_date", 2000),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => db.entities.WorkoutPlan.list("name", 100),
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("name", 500),
  });

  const filtered = workouts.filter(w => {
    if (filterPlan !== "all" && w.plan_id !== filterPlan) return false;
    if (filterExercise !== "all") {
      const items = workoutItems.filter(i => i.completed_workout_id === w.id);
      if (!items.some(i => i.executed_exercise_id === filterExercise)) return false;
    }
    return true;
  });

  const selectedItems = selectedWorkout 
    ? workoutItems.filter(i => i.completed_workout_id === selectedWorkout.id).sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm">{workouts.length} treinos realizados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <SelectValue placeholder="Filtrar por ficha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fichas</SelectItem>
            {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterExercise} onValueChange={setFilterExercise}>
          <SelectTrigger className="w-full sm:w-56 rounded-xl">
            <SelectValue placeholder="Filtrar por exercício" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os exercícios</SelectItem>
            {exercises.filter(e => e.active !== false).map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise history button */}
      <div className="flex gap-2 flex-wrap">
        {exercises.filter(e => e.active !== false).slice(0, 6).map(ex => (
          <Button key={ex.id} variant="outline" size="sm" className="rounded-lg gap-1.5"
            onClick={() => setShowExerciseHistory(ex)}>
            <TrendingUp className="w-3 h-3" /> {ex.name}
          </Button>
        ))}
        {exercises.filter(e => e.active !== false).length > 6 && (
          <Select onValueChange={(id) => {
            const ex = exercises.find(e => e.id === id);
            if (ex) setShowExerciseHistory(ex);
          }}>
            <SelectTrigger className="w-40 h-8 rounded-lg text-xs">
              <SelectValue placeholder="Mais exercícios..." />
            </SelectTrigger>
            <SelectContent>
              {exercises.filter(e => e.active !== false).map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Workouts list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <Card key={i} className="border-0 shadow-sm animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhum treino encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(workout => (
            <Card key={workout.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedWorkout(workout)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary leading-none">
                    {format(new Date(workout.workout_date), "dd")}
                  </span>
                  <span className="text-xs text-primary/70">
                    {format(new Date(workout.workout_date), "MMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{workout.plan_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {workout.total_exercises || "—"} exercícios · {format(new Date(workout.workout_date), "EEEE", { locale: ptBR })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Workout detail dialog */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkout?.plan_name} — {selectedWorkout && format(new Date(selectedWorkout.workout_date), "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          {selectedWorkout?.general_notes && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-xl">{selectedWorkout.general_notes}</p>
          )}
          <div className="space-y-3">
            {selectedItems.map((item, i) => (
              <div key={item.id} className="p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-primary bg-primary/10 w-5 h-5 rounded flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-sm">{item.executed_exercise_name}</span>
                  <Badge variant={item.execution_type === "principal" ? "default" : "secondary"} className="text-xs">
                    {item.execution_type}
                  </Badge>
                </div>
                {item.planned_exercise_name !== item.executed_exercise_name && (
                  <p className="text-xs text-muted-foreground ml-7">Planejado: {item.planned_exercise_name}</p>
                )}
                <div className="flex gap-4 mt-1 ml-7 text-sm">
                  <span>{item.sets}x{item.reps}</span>
                  {item.load_used != null && <span className="font-semibold">{item.load_used}kg</span>}
                  {item.previous_load != null && (
                    <span className="text-muted-foreground">ant: {item.previous_load}kg</span>
                  )}
                  {item.rest && <span className="text-muted-foreground">{item.rest}s</span>}
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mt-1 ml-7">{item.notes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise history dialog */}
      <Dialog open={!!showExerciseHistory} onOpenChange={() => setShowExerciseHistory(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico: {showExerciseHistory?.name}</DialogTitle>
          </DialogHeader>
          {showExerciseHistory && (
            <ExerciseHistory exercise={showExerciseHistory} allItems={workoutItems} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}