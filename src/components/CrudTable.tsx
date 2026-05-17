import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
}

export function CrudTable<T extends { id: string }>({
  title,
  description,
  rows,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  loading?: boolean;
}) {
  const { role } = useAuth();
  const canWrite = role === "admin" || role === "editor";
  const canDelete = role === "admin";

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {canWrite && onAdd && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={String(c.key)}>{c.header}</TableHead>
              ))}
              {(canWrite || canDelete) && <TableHead className="w-28 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">
                  No records yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c) => (
                    <TableCell key={String(c.key)}>
                      {c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key as string] as ReactNode) ?? "—"}
                    </TableCell>
                  ))}
                  {(canWrite || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canWrite && onEdit && (
                          <Button size="icon" variant="ghost" onClick={() => onEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && onDelete && (
                          <Button size="icon" variant="ghost" onClick={() => onDelete(r)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
