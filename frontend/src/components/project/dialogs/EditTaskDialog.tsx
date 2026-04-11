import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type ProjectService, type Task } from "@/api/client";

interface EditTaskDialogProps {
  task: Task | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (t: Task) => void;
  loading: boolean;
  projectServices: ProjectService[];
}

export default function EditTaskDialog({ task, onClose, onSave, onChange, projectServices }: EditTaskDialogProps) {
  return (
    <Dialog open={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Task Düzenle</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Başlık</label>
              <input
                type="text"
                value={task.title}
                onChange={(e) => onChange({ ...task, title: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama</label>
              <Textarea
                value={task.description}
                onChange={(e) => onChange({ ...task, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kabul Kriterleri</label>
              <Textarea
                value={task.acceptanceCriteria}
                onChange={(e) => onChange({ ...task, acceptanceCriteria: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => onChange({ ...task, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={task.category || ""}
                  onChange={(e) => onChange({ ...task, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">—</option>
                  <option value="BACKEND">BACKEND</option>
                  <option value="FRONTEND">FRONTEND</option>
                  <option value="MOBILE">MOBILE</option>
                  <option value="DATABASE">DATABASE</option>
                  <option value="DEVOPS">DEVOPS</option>
                  <option value="TESTING">TESTING</option>
                  <option value="FULLSTACK">FULLSTACK</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Service</label>
              <select
                value={task.serviceId ?? ""}
                onChange={(e) => onChange({ ...task, serviceId: e.target.value ? Number(e.target.value) : null })}
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
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onClose}>İptal</Button>
              <Button size="sm" onClick={onSave}>Kaydet</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
