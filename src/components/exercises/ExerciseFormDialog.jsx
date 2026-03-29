import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { muscleGroupLabels } from "@/lib/muscleGroups";

const defaultExercise = {
  name: "", muscle_group: "peito", exercise_type: "composto",
  equipment: "", default_sets: 3, default_reps: 12, default_rest: 60,
  base_weight: 0, last_load: 0, notes: "", active: true,
};

export default function ExerciseFormDialog({ open, onOpenChange, exercise, onSave }) {
  const [form, setForm] = useState(defaultExercise);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exercise) {
      setForm({ ...defaultExercise, ...exercise });
    } else {
      setForm(defaultExercise);
    }
  }, [exercise, open]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exercise ? "Editar Exercício" : "Novo Exercício"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: Supino Reto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Grupo Muscular *</Label>
              <Select value={form.muscle_group} onValueChange={v => set("muscle_group", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(muscleGroupLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.exercise_type || "composto"} onValueChange={v => set("exercise_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="composto">Composto</SelectItem>
                  <SelectItem value="isolado">Isolado</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="funcional">Funcional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Equipamento</Label>
            <Input value={form.equipment || ""} onChange={e => set("equipment", e.target.value)} placeholder="Ex: Barra, Halter, Máquina" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Séries</Label>
              <Input type="number" value={form.default_sets || ""} onChange={e => set("default_sets", Number(e.target.value))} />
            </div>
            <div>
              <Label>Reps</Label>
              <Input type="number" value={form.default_reps || ""} onChange={e => set("default_reps", Number(e.target.value))} />
            </div>
            <div>
              <Label>Descanso (s)</Label>
              <Input type="number" value={form.default_rest || ""} onChange={e => set("default_rest", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Peso Base (kg)</Label>
              <Input type="number" value={form.base_weight || ""} onChange={e => set("base_weight", Number(e.target.value))} />
            </div>
            <div>
              <Label>Última Carga (kg)</Label>
              <Input type="number" value={form.last_load || ""} onChange={e => set("last_load", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active !== false} onCheckedChange={v => set("active", v)} />
            <Label>Exercício ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}