import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Timer } from "lucide-react";
import RestTimer from "./RestTimer";

export default function ExerciseRow({ 
  item, exercises, substitutions, index, 
  rowState, onRowChange,
  globalRest  // inherited global rest (null = no global override)
}) {
  const [expanded, setExpanded] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  // Build the dropdown options: main + substitutes
  const mainExercise = exercises.find(e => e.id === item.exercise_id);
  const subs = substitutions.filter(s => s.main_exercise_id === item.exercise_id);
  
  const options = [];
  if (mainExercise) {
    options.push({ id: mainExercise.id, name: mainExercise.name, type: "principal" });
  }
  subs.forEach(sub => {
    const subEx = exercises.find(e => e.id === sub.substitute_exercise_id);
    if (subEx) {
      options.push({ id: subEx.id, name: subEx.name, type: "substituto" });
    }
  });

  // Resolve previous load with fallback chain
  const getResolvedPreviousLoad = (executedId) => {
    const executed = exercises.find(e => e.id === executedId);
    if (executed?.last_load) return { value: executed.last_load, source: "executado" };
    if (executed?.base_weight) return { value: executed.base_weight, source: "peso base" };
    if (mainExercise?.last_load) return { value: mainExercise.last_load, source: "principal" };
    if (mainExercise?.base_weight) return { value: mainExercise.base_weight, source: "peso base principal" };
    return { value: null, source: "sem registro" };
  };

  const handleExerciseChange = (exerciseId) => {
    const isMain = exerciseId === item.exercise_id;
    const resolved = getResolvedPreviousLoad(exerciseId);
    const selectedOption = options.find(o => o.id === exerciseId);
    onRowChange({
      ...rowState,
      executed_exercise_id: exerciseId,
      executed_exercise_name: selectedOption?.name || "",
      execution_type: isMain ? "principal" : "substituto",
      previous_load: resolved.value,
      previous_load_source: resolved.source,
    });
  };

  // Initialize executed exercise when component mounts
  useEffect(() => {
    if (!rowState.executed_exercise_id && mainExercise) {
      handleExerciseChange(mainExercise.id);
    }
  }, [mainExercise?.id]);

  // REST HIERARCHY: serie-level > exercise-level > global > item default
  // rowState.useCustomRest = true means this exercise has its own rest
  // rowState.rest = the exercise-level rest value
  const resolvedRest = (() => {
    if (rowState.useCustomRest && rowState.rest) return rowState.rest;
    if (globalRest != null) return globalRest;
    return item.planned_rest || 60;
  })();

  const handleStartTimer = () => {
    // Mark as done + start timer
    onRowChange({ ...rowState, checked: true });
    setTimerActive(true);
  };

  const prevLoad = rowState.previous_load;

  return (
    <div className={`rounded-xl border transition-colors ${rowState.checked ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
      <div className="p-3 flex items-start gap-3">
        <Checkbox 
          checked={rowState.checked} 
          onCheckedChange={(v) => onRowChange({ ...rowState, checked: v })}
          className="mt-1.5 h-5 w-5"
        />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="font-semibold text-sm truncate">{item.exercise_name}</span>
            {rowState.execution_type && (
              <Badge variant={rowState.execution_type === "principal" ? "default" : "secondary"} className="text-xs">
                {rowState.execution_type}
              </Badge>
            )}
          </div>

          {/* Exercise selector */}
          <Select value={rowState.executed_exercise_id || ""} onValueChange={handleExerciseChange}>
            <SelectTrigger className="h-9 rounded-lg text-sm">
              <SelectValue placeholder="Exercício executado" />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.id} value={opt.id}>
                  <span className="flex items-center gap-2">
                    {opt.name}
                    <span className={`text-xs ${opt.type === "principal" ? "text-primary" : "text-muted-foreground"}`}>
                      ({opt.type})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick fields */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Séries</label>
              <Input type="number" className="h-9 text-center rounded-lg" 
                value={rowState.sets ?? ""} 
                onChange={e => onRowChange({ ...rowState, sets: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reps</label>
              <Input type="number" className="h-9 text-center rounded-lg" 
                value={rowState.reps ?? ""} 
                onChange={e => onRowChange({ ...rowState, reps: Number(e.target.value) })} 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Anterior</label>
              <div className="h-9 flex items-center justify-center text-sm font-medium bg-muted rounded-lg px-1">
                {prevLoad != null ? `${prevLoad}kg` : "—"}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold text-primary">Carga</label>
              <Input type="number" className="h-9 text-center rounded-lg border-primary/50 font-semibold" 
                placeholder="kg"
                value={rowState.load_used ?? ""} 
                onChange={e => onRowChange({ ...rowState, load_used: e.target.value === "" ? null : Number(e.target.value) })} 
              />
            </div>
          </div>

          {/* Rest timer button */}
          {!timerActive ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 rounded-lg text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleStartTimer}
            >
              <Timer className="w-3.5 h-3.5" />
              Iniciar Descanso ({resolvedRest}s
              {rowState.useCustomRest ? " · personalizado" : globalRest != null ? " · global" : " · padrão"})
            </Button>
          ) : (
            <RestTimer
              key={resolvedRest}
              seconds={resolvedRest}
              onComplete={() => setTimerActive(false)}
            />
          )}

          {/* Expand for more */}
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Menos" : "Mais detalhes"}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1">
              {/* Custom rest toggle for this exercise */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`custom-rest-${item.id}`}
                  checked={!!rowState.useCustomRest}
                  onCheckedChange={(v) => onRowChange({
                    ...rowState,
                    useCustomRest: v,
                    rest: v ? (rowState.rest || item.planned_rest || 60) : undefined,
                  })}
                />
                <label htmlFor={`custom-rest-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">
                  Descanso personalizado para este exercício
                </label>
              </div>

              {rowState.useCustomRest && (
                <div>
                  <label className="text-xs text-muted-foreground">Descanso (s)</label>
                  <Input type="number" className="h-9 rounded-lg" 
                    value={rowState.rest ?? ""} 
                    onChange={e => onRowChange({ ...rowState, rest: Number(e.target.value) })} 
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Observações</label>
                <Input className="h-9 rounded-lg" 
                  value={rowState.notes || ""} 
                  onChange={e => onRowChange({ ...rowState, notes: e.target.value })} 
                />
              </div>

              {rowState.previous_load_source && (
                <p className="text-xs text-muted-foreground">
                  Carga anterior via: {rowState.previous_load_source}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}