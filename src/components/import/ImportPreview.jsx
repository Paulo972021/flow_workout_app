import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, X, Loader2 } from "lucide-react";

const typeLabels = {
  exercises: "Exercícios",
  substitutions: "Substituições",
  plans: "Fichas de Treino",
};

export default function ImportPreview({ data, onConfirm, onCancel, importing }) {
  const columns = data.items.length > 0 ? Object.keys(data.items[0]) : [];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Prévia: {typeLabels[data.type]}
            <Badge>{data.items.length} registros</Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96 rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(col => (
                    <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                      {String(row[col] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.items.length > 50 && (
          <p className="text-xs text-muted-foreground mt-2">Mostrando 50 de {data.items.length} registros</p>
        )}
        <div className="flex gap-3 mt-4 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={importing}>Cancelar</Button>
          <Button onClick={() => onConfirm(data)} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {importing ? "Importando..." : `Importar ${data.items.length} registros`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}