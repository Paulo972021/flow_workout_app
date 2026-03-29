const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ImportPreview from "@/components/import/ImportPreview";

export default function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const queryClient = useQueryClient();

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: () => db.entities.Exercise.list("name", 500),
  });
  const { data: substitutions = [] } = useQuery({
    queryKey: ["substitutions"],
    queryFn: () => db.entities.ExerciseSubstitution.list("-created_date", 500),
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["workout-plans"],
    queryFn: () => db.entities.WorkoutPlan.list("name", 100),
  });
  const { data: planItems = [] } = useQuery({
    queryKey: ["workout-plan-items-all"],
    queryFn: () => db.entities.WorkoutPlanItem.list("order", 500),
  });
  const { data: workouts = [] } = useQuery({
    queryKey: ["completed-workouts"],
    queryFn: () => db.entities.CompletedWorkout.list("-workout_date", 200),
  });
  const { data: workoutItems = [] } = useQuery({
    queryKey: ["completed-workout-items"],
    queryFn: () => db.entities.CompletedWorkoutItem.list("-created_date", 2000),
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportType(type);
    setImporting(true);

    const schemas = {
      exercises: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                grupo_muscular: { type: "string" },
                equipamento: { type: "string" },
                series: { type: "number" },
                reps: { type: "number" },
                descanso: { type: "number" },
                peso_base: { type: "number" },
                ultima_carga: { type: "number" },
                observacoes: { type: "string" },
              }
            }
          }
        }
      },
      substitutions: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercicio_principal: { type: "string" },
                exercicio_substituto: { type: "string" },
                tipo_substituicao: { type: "string" },
                observacao: { type: "string" },
              }
            }
          }
        }
      },
      plans: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                treino: { type: "string" },
                exercicio_principal: { type: "string" },
                grupo_muscular: { type: "string" },
                series: { type: "number" },
                reps: { type: "number" },
                descanso: { type: "number" },
                ordem: { type: "number" },
              }
            }
          }
        }
      },
    };

    const { file_url } = await db.integrations.Core.UploadFile({ file });
    const result = await db.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: schemas[type],
    });

    if (result.status === "success" && result.output) {
      setPreviewData({ type, items: result.output.items || [] });
    } else {
      toast.error("Erro ao processar arquivo: " + (result.details || "Formato não reconhecido"));
    }
    setImporting(false);
    e.target.value = "";
  };

  const handleConfirmImport = async (data) => {
    setImporting(true);
    
    if (data.type === "exercises") {
      const muscleMap = {
        peito: "peito", costas: "costas", ombros: "ombros", bíceps: "biceps", biceps: "biceps",
        tríceps: "triceps", triceps: "triceps", antebraço: "antebraco", antebraco: "antebraco",
        abdômen: "abdomen", abdomen: "abdomen", quadríceps: "quadriceps", quadriceps: "quadriceps",
        posterior: "posterior", glúteos: "gluteos", gluteos: "gluteos", panturrilha: "panturrilha",
        trapézio: "trapezio", trapezio: "trapezio", lombar: "lombar", "corpo todo": "corpo_todo"
      };
      
      for (const item of data.items) {
        const existing = exercises.find(e => e.name?.toLowerCase() === item.nome?.toLowerCase());
        if (existing) continue;
        
        const mg = item.grupo_muscular?.toLowerCase().trim();
        await db.entities.Exercise.create({
          name: item.nome,
          muscle_group: muscleMap[mg] || "corpo_todo",
          equipment: item.equipamento || "",
          default_sets: item.series || 3,
          default_reps: item.reps || 12,
          default_rest: item.descanso || 60,
          base_weight: item.peso_base || 0,
          last_load: item.ultima_carga || 0,
          notes: item.observacoes || "",
          active: true,
        });
      }
    } else if (data.type === "substitutions") {
      const allExercises = await db.entities.Exercise.list("name", 500);
      for (const item of data.items) {
        const mainEx = allExercises.find(e => e.name?.toLowerCase() === item.exercicio_principal?.toLowerCase());
        const subEx = allExercises.find(e => e.name?.toLowerCase() === item.exercicio_substituto?.toLowerCase());
        if (!mainEx || !subEx) continue;
        
        await db.entities.ExerciseSubstitution.create({
          main_exercise_id: mainEx.id,
          main_exercise_name: mainEx.name,
          substitute_exercise_id: subEx.id,
          substitute_exercise_name: subEx.name,
          substitution_type: item.tipo_substituicao || "equivalente",
          notes: item.observacao || "",
        });
      }
    } else if (data.type === "plans") {
      const allExercises = await db.entities.Exercise.list("name", 500);
      const planGroups = {};
      data.items.forEach(item => {
        const name = item.treino || "Treino Importado";
        if (!planGroups[name]) planGroups[name] = [];
        planGroups[name].push(item);
      });

      for (const [planName, planItemsList] of Object.entries(planGroups)) {
        const plan = await db.entities.WorkoutPlan.create({ name: planName, active: true });
        for (let i = 0; i < planItemsList.length; i++) {
          const item = planItemsList[i];
          const ex = allExercises.find(e => e.name?.toLowerCase() === item.exercicio_principal?.toLowerCase());
          if (!ex) continue;
          await db.entities.WorkoutPlanItem.create({
            plan_id: plan.id,
            order: item.ordem || i + 1,
            exercise_id: ex.id,
            exercise_name: ex.name,
            planned_sets: item.series || 3,
            planned_reps: item.reps || 12,
            planned_rest: item.descanso || 60,
          });
        }
      }
    }

    queryClient.invalidateQueries();
    setPreviewData(null);
    setImporting(false);
    toast.success("Importação concluída com sucesso!");
  };

  // Export functions
  const exportCSV = (data, filename) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Importar & Exportar</h1>

      {previewData ? (
        <ImportPreview data={previewData} onConfirm={handleConfirmImport} onCancel={() => setPreviewData(null)} importing={importing} />
      ) : (
        <Tabs defaultValue="import">
          <TabsList className="rounded-xl">
            <TabsTrigger value="import" className="rounded-lg gap-1.5"><Upload className="w-4 h-4" />Importar</TabsTrigger>
            <TabsTrigger value="export" className="rounded-lg gap-1.5"><Download className="w-4 h-4" />Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">Faça upload de arquivos CSV ou Excel para importar dados.</p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <ImportCard
                title="Exercícios"
                desc="Nome, grupo muscular, séries, reps, peso..."
                onUpload={(e) => handleFileUpload(e, "exercises")}
                loading={importing && importType === "exercises"}
              />
              <ImportCard
                title="Substituições"
                desc="Exercício principal, substituto, tipo..."
                onUpload={(e) => handleFileUpload(e, "substitutions")}
                loading={importing && importType === "substitutions"}
              />
              <ImportCard
                title="Fichas de Treino"
                desc="Treino, exercício, séries, reps, ordem..."
                onUpload={(e) => handleFileUpload(e, "plans")}
                loading={importing && importType === "plans"}
              />
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">Exporte seus dados em CSV ou JSON.</p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <ExportCard title="Exercícios" count={exercises.length}
                onCSV={() => exportCSV(exercises.map(e => ({
                  nome: e.name, grupo_muscular: e.muscle_group, equipamento: e.equipment,
                  series: e.default_sets, reps: e.default_reps, descanso: e.default_rest,
                  peso_base: e.base_weight, ultima_carga: e.last_load, observacoes: e.notes, ativo: e.active
                })), "exercicios")}
                onJSON={() => exportJSON(exercises, "exercicios")}
              />
              <ExportCard title="Substituições" count={substitutions.length}
                onCSV={() => exportCSV(substitutions.map(s => ({
                  exercicio_principal: s.main_exercise_name, exercicio_substituto: s.substitute_exercise_name,
                  tipo_substituicao: s.substitution_type, observacao: s.notes
                })), "substituicoes")}
                onJSON={() => exportJSON(substitutions, "substituicoes")}
              />
              <ExportCard title="Fichas de Treino" count={planItems.length}
                onCSV={() => {
                  const data = planItems.map(item => {
                    const plan = plans.find(p => p.id === item.plan_id);
                    return {
                      treino: plan?.name, exercicio: item.exercise_name, ordem: item.order,
                      series: item.planned_sets, reps: item.planned_reps, descanso: item.planned_rest
                    };
                  });
                  exportCSV(data, "fichas");
                }}
                onJSON={() => exportJSON({ plans, items: planItems }, "fichas")}
              />
              <ExportCard title="Histórico" count={workouts.length}
                onCSV={() => {
                  const data = workoutItems.map(item => ({
                    data: item.workout_date, exercicio_planejado: item.planned_exercise_name,
                    exercicio_executado: item.executed_exercise_name, tipo: item.execution_type,
                    series: item.sets, reps: item.reps, carga_anterior: item.previous_load,
                    carga_usada: item.load_used, descanso: item.rest, observacoes: item.notes
                  }));
                  exportCSV(data, "historico");
                }}
                onJSON={() => exportJSON({ workouts, items: workoutItems }, "historico")}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ImportCard({ title, desc, onUpload, loading }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex flex-col items-center text-center">
        <FileSpreadsheet className="w-10 h-10 text-primary mb-3" />
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-4">{desc}</p>
        <label className="cursor-pointer w-full">
          <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.json" onChange={onUpload} disabled={loading} />
          <Button variant="outline" className="w-full gap-2 rounded-xl" asChild disabled={loading}>
            <span>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? "Processando..." : "Escolher arquivo"}
            </span>
          </Button>
        </label>
      </CardContent>
    </Card>
  );
}

function ExportCard({ title, count, onCSV, onJSON }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg" onClick={onCSV}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-lg" onClick={onJSON}>
            <Download className="w-3.5 h-3.5" /> JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}