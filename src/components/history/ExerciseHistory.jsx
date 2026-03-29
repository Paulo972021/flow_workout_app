import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ExerciseHistory({ exercise, allItems }) {
  // Get all items where this exercise was executed
  const items = allItems
    .filter(i => i.executed_exercise_id === exercise.id && i.load_used != null)
    .sort((a, b) => new Date(a.workout_date) - new Date(b.workout_date));

  // Chart data
  const chartData = items.map(item => ({
    date: format(new Date(item.workout_date), "dd/MM"),
    carga: item.load_used,
    reps: item.reps,
    sets: item.sets,
  }));

  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum registro de carga para este exercício</p>;
  }

  return (
    <div className="space-y-4">
      {/* Current info */}
      <div className="flex gap-4 flex-wrap">
        <div className="bg-primary/10 rounded-xl p-3 flex-1 min-w-[100px] text-center">
          <p className="text-2xl font-bold text-primary">{exercise.last_load || "—"}kg</p>
          <p className="text-xs text-muted-foreground">Última carga</p>
        </div>
        <div className="bg-muted rounded-xl p-3 flex-1 min-w-[100px] text-center">
          <p className="text-2xl font-bold">{exercise.base_weight || "—"}kg</p>
          <p className="text-xs text-muted-foreground">Peso base</p>
        </div>
        <div className="bg-muted rounded-xl p-3 flex-1 min-w-[100px] text-center">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">Registros</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ 
                  borderRadius: "12px", 
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))"
                }}
              />
              <Line type="monotone" dataKey="carga" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History list */}
      <div className="space-y-2">
        {[...items].reverse().map((item, i) => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">{format(new Date(item.workout_date), "dd/MM/yyyy")}</span>
            <span>{item.sets}x{item.reps}</span>
            <span className="font-semibold">{item.load_used}kg</span>
            <Badge variant={item.execution_type === "principal" ? "default" : "secondary"} className="text-xs">
              {item.execution_type}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}