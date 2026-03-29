const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, Loader2, Timer, Dumbbell, Wind } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ExerciseRow from "@/components/execution/ExerciseRow";

export default function WorkoutExecution() {
  const planId = window.location.pathname.split("/execute/")[1];
  const queryClient = useQueryClient();
  const [rows, setRows] = useState({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Global rest config
  const [useGlobalRest, setUseGlobalRest] = useState(false);
  const [globalRestValue, setGlobalRestValue] = useState(60);

  // Aerobic section
  const [includeAerobic, setIncludeAerobic] = useState(false);
  const [aerobicType, setAerobicType] = useState("");
  const [aerobicDuration, setAerobicDuration] = useState("");
  const [aerobicNotes, setAerobicNotes] = useState("");

  const { data: plan } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const plans = await db.entities.WorkoutPlan.filter({ id: planId });
      return plans[0];
    },
    enabled: !!planId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["plan-items", planId],
    queryFn: () => db.entities.WorkoutPlanItem.filter({ plan_id: planId }, "order"),
    enabled: !!planId,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("name", 500),
  });

  const { data: substitutions = [] } = useQuery({
    queryKey: ["substitutions"],
    queryFn: () => db.entities.ExerciseSubstitution.list("-created_date", 500),
  });

  // Initialize rows from plan items
  useEffect(() => {
    if (items.length > 0 && Object.keys(rows).length === 0) {
      const initial = {};
      items.forEach(item => {
        initial[item.id] = {
          checked: true,
          executed_exercise_id: "",
          executed_exercise_name: "",
          execution_type: "principal",
          sets: item.planned_sets || 3,
          reps: item.planned_reps || 12,
          rest: item.planned_rest || 60,
          useCustomRest: false,
          previous_load: null,
          previous_load_source: "",
          load_used: null,
          notes: item.notes || "",
        };
      });
      setRows(initial);
    }
  }, [items]);

  const updateRow = (itemId, newState) => {
    setRows(prev => ({ ...prev, [itemId]: newState }));
  };

  const handleRegister = async () => {
    const checkedItems = items.filter(item => rows[item.id]?.checked);
    if (checkedItems.length === 0 && !includeAerobic) {
      toast.error("Marque pelo menos um exercício ou inclua aeróbico!");
      return;
    }

    setSaving(true);

    const today = format(new Date(), "yyyy-MM-dd");

    // Build aerobic notes suffix
    let aerobicSuffix = "";
    if (includeAerobic) {
      const parts = [];
      if (aerobicType) parts.push(`Aeróbico: ${aerobicType}`);
      if (aerobicDuration) parts.push(`${aerobicDuration} min`);
      if (aerobicNotes) parts.push(aerobicNotes);
      aerobicSuffix = parts.length > 0 ? `\n[Aeróbico] ${parts.join(" · ")}` : "";
    }

    // 1. Create completed workout
    const workout = await db.entities.CompletedWorkout.create({
      plan_id: planId,
      plan_name: plan?.name || "",
      workout_date: today,
      general_notes: generalNotes + aerobicSuffix,
      total_exercises: checkedItems.length,
    });

    // 2. Create completed workout items + update last_load
    for (const item of checkedItems) {
      const row = rows[item.id];

      // Resolve rest for this item using hierarchy
      const effectiveRest = row.useCustomRest && row.rest
        ? row.rest
        : useGlobalRest
        ? globalRestValue
        : item.planned_rest || 60;

      await db.entities.CompletedWorkoutItem.create({
        completed_workout_id: workout.id,
        workout_date: today,
        order: item.order,
        planned_exercise_id: item.exercise_id,
        planned_exercise_name: item.exercise_name,
        executed_exercise_id: row.executed_exercise_id,
        executed_exercise_name: row.executed_exercise_name,
        execution_type: row.execution_type,
        sets: row.sets,
        reps: row.reps,
        previous_load: row.previous_load,
        load_used: row.load_used,
        rest: effectiveRest,
        notes: row.notes,
      });

      // Update last_load only if load was filled and different from previous
      if (row.load_used != null && row.load_used !== row.previous_load && row.executed_exercise_id) {
        await db.entities.Exercise.update(row.executed_exercise_id, { last_load: row.load_used });
      }
    }

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ["exercises"] });
    queryClient.invalidateQueries({ queryKey: ["recent-workouts"] });

    setSaving(false);
    setSaved(true);
    toast.success("Treino registrado com sucesso! 💪");
  };

  const checkedCount = Object.values(rows).filter(r => r.checked).length;

  if (!plan) return null;

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Treino Registrado!</h2>
        <p className="text-muted-foreground mb-6">{plan.name} · {checkedCount} exercício{checkedCount !== 1 ? "s" : ""}</p>
        <div className="flex gap-3">
          <Link to="/"><Button variant="outline" className="rounded-xl">Início</Button></Link>
          <Link to="/history"><Button className="rounded-xl">Ver Histórico</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/plans">
          <Button variant="ghost" size="icon" className="rounded-xl shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{plan.name}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "dd/MM/yyyy")} · {checkedCount}/{items.length} exercícios</p>
        </div>
      </div>

      {/* Global rest config */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Configuração de Descanso</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="global-rest"
              checked={useGlobalRest}
              onCheckedChange={setUseGlobalRest}
            />
            <label htmlFor="global-rest" className="text-sm cursor-pointer">
              Aplicar mesmo descanso para todos os exercícios e séries
            </label>
          </div>
          {useGlobalRest && (
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                className="h-9 w-28 rounded-lg text-center"
                value={globalRestValue}
                onChange={e => setGlobalRestValue(Number(e.target.value))}
                min={5}
              />
              <span className="text-sm text-muted-foreground">segundos (global)</span>
            </div>
          )}
          {!useGlobalRest && (
            <p className="text-xs text-muted-foreground">
              Cada exercício usará o descanso do planejamento. Você pode personalizar por exercício nas opções de cada um.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exercise rows */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <ExerciseRow
            key={item.id}
            item={item}
            exercises={exercises}
            substitutions={substitutions}
            index={index}
            rowState={rows[item.id] || {}}
            onRowChange={(newState) => updateRow(item.id, newState)}
            globalRest={useGlobalRest ? globalRestValue : null}
          />
        ))}
      </div>

      {/* Aerobic section — opt-in only */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-aerobic"
              checked={includeAerobic}
              onCheckedChange={setIncludeAerobic}
            />
            <label htmlFor="include-aerobic" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-sky-500" />
              Incluir aeróbico neste treino
            </label>
          </div>

          {includeAerobic && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Tipo de aeróbico</label>
                  <Input
                    className="h-9 rounded-lg"
                    placeholder="Ex: esteira, bike..."
                    value={aerobicType}
                    onChange={e => setAerobicType(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Duração (min)</label>
                  <Input
                    type="number"
                    className="h-9 rounded-lg text-center"
                    placeholder="30"
                    value={aerobicDuration}
                    onChange={e => setAerobicDuration(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Observações do aeróbico</label>
                <Input
                  className="h-9 rounded-lg"
                  placeholder="Velocidade, inclinação, intensidade..."
                  value={aerobicNotes}
                  onChange={e => setAerobicNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* General notes */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <label className="text-sm font-medium mb-2 block">Observações gerais do treino</label>
          <Textarea 
            value={generalNotes} 
            onChange={e => setGeneralNotes(e.target.value)} 
            rows={2} 
            placeholder="Como foi o treino hoje?" 
            className="rounded-xl"
          />
        </CardContent>
      </Card>

      {/* Register button - sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-background/80 backdrop-blur-lg border-t">
        <Button 
          onClick={handleRegister} 
          disabled={saving || (checkedCount === 0 && !includeAerobic)} 
          className="w-full h-14 text-lg font-bold rounded-2xl gap-2"
          size="lg"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> Registrar Treino{checkedCount > 0 ? ` (${checkedCount})` : ""}</>
          )}
        </Button>
      </div>
    </div>
  );
}