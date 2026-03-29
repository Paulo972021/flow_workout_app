const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useQuery } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, Dumbbell, ArrowLeftRight, ClipboardList, 
  History, FileUp, Calendar, TrendingUp, Zap, Sun, Moon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { muscleGroupLabels } from "@/lib/muscleGroups";
import { useTheme } from "@/hooks/useTheme";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["workout-plans-active"],
    queryFn: () => db.entities.WorkoutPlan.filter({ active: true }),
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises-count"],
    queryFn: () => db.entities.Exercise.filter({ active: true }),
  });

  const { data: recentWorkouts = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-workouts"],
    queryFn: () => db.entities.CompletedWorkout.list("-workout_date", 5),
  });

  const lastWorkout = recentWorkouts[0];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar to-sidebar/80 p-6 md:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
          title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
        </button>
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Bora treinar! 💪</h1>
          <p className="text-white/60 mb-6">Escolha sua ficha e comece agora</p>
          <div className="flex flex-wrap gap-3">
            {loadingPlans ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-32 rounded-xl" />)
            ) : plans.length > 0 ? (
              plans.map(plan => (
                <Link key={plan.id} to={`/execute/${plan.id}`}>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-12 px-6 gap-2">
                    <Play className="w-4 h-4" />
                    {plan.name}
                  </Button>
                </Link>
              ))
            ) : (
              <Link to="/plans">
                <Button size="lg" variant="secondary" className="rounded-xl h-12 px-6 gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Criar primeira ficha
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} label="Exercícios" value={exercises.length} />
        <StatCard icon={ClipboardList} label="Fichas Ativas" value={plans.length} />
        <StatCard icon={History} label="Treinos" value={recentWorkouts.length} suffix="últimos" />
        <StatCard icon={TrendingUp} label="Esta Semana" value={
          recentWorkouts.filter(w => {
            const d = new Date(w.workout_date);
            const now = new Date();
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            return d >= weekAgo;
          }).length
        } />
      </div>

      {/* Last workout */}
      {lastWorkout && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Último Treino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{lastWorkout.plan_name}</p>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(lastWorkout.workout_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <Link to="/history">
                <Button variant="outline" size="sm" className="rounded-lg">Ver histórico</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink to="/exercises" icon={Dumbbell} label="Exercícios" desc="Cadastrar e gerenciar" />
        <QuickLink to="/substitutions" icon={ArrowLeftRight} label="Substituições" desc="Exercícios alternativos" />
        <QuickLink to="/plans" icon={ClipboardList} label="Fichas" desc="Montar treinos" />
        <QuickLink to="/import-export" icon={FileUp} label="Importar" desc="CSV, Excel" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, icon: Icon, label, desc }) {
  return (
    <Link to={to}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4">
          <Icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  );
}