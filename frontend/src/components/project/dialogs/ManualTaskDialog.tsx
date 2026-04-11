import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProjectService } from "@/api/client";

interface ManualTaskForm {
  title: string;
  description: string;
  priority: string;
  category: string;
  serviceId: number | "";
}

interface ManualTaskDialogProps {
  open: boolean;
  onClose: () => void;
  form: ManualTaskForm;
  onChange: (f: ManualTaskForm) => void;
  onSubmit: () => void;
  loading: boolean;
  projectServices: ProjectService[];
}

export default function ManualTaskDialog({ open, onClose, form, onChange, onSubmit, loading, projectServices }: ManualTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Task Ekle</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label htmlFor="manual-task-title" className="text-sm font-medium mb-1 block">Başlık *</label>
            <input
              id="manual-task-title"
              type="text"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Task başlığı"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="manual-task-desc" className="text-sm font-medium mb-1 block">Açıklama</label>
            <textarea
              id="manual-task-desc"
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              placeholder="Opsiyonel"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-task-priority" className="text-sm font-medium mb-1 block">Öncelik</label>
              <select
                id="manual-task-priority"
                value={form.priority}
                onChange={(e) => onChange({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label htmlFor="manual-task-category" className="text-sm font-medium mb-1 block">Kategori</label>
              <input
                id="manual-task-category"
                type="text"
                value={form.category}
                onChange={(e) => onChange({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Opsiyonel"
              />
            </div>
          </div>
          <div>
            <label htmlFor="manual-task-service" className="text-sm font-medium mb-1 block">Service</label>
            <select
              id="manual-task-service"
              value={form.serviceId}
              onChange={(e) => onChange({ ...form, serviceId: e.target.value ? Number(e.target.value) : "" })}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Atanmadı</option>
              {projectServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.serviceType})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onClose}>İptal</Button>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={!form.title.trim() || loading}
            >
              {loading ? "Ekleniyor..." : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
