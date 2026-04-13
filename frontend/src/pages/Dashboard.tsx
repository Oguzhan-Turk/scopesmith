import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getProjects, createProject, type Project } from "@/api/client";
import { timeAgo } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (e) {
      console.error("Failed to load projects:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject({ name: newName, description: newDesc || undefined });
      setNewName("");
      setNewDesc("");
      setDialogOpen(false);
      await loadProjects();
    } catch (e) {
      console.error("Failed to create project:", e);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Yükleniyor...</div>;
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[1.5rem] font-bold text-foreground tracking-tight">Projeler</h1>
          <p className="text-[0.82rem] text-muted-foreground mt-1">
            Taleplerinizi analiz edin, task'lara dönüştürün
          </p>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Proje</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="proj-name" className="text-sm font-medium mb-1 block">Proje Adı</label>
              <input
                id="proj-name"
                type="text"
                placeholder="Proje adı"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-[10px] bg-card text-[0.85rem] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="proj-desc" className="text-sm font-medium mb-1 block">Açıklama</label>
              <textarea
                id="proj-desc"
                placeholder="Opsiyonel"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border rounded-[10px] bg-card resize-none text-[0.85rem] focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/8"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full py-2.5 rounded-[8px] text-[0.82rem] font-semibold text-white disabled:opacity-50 transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {projects.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00bcd422, #00d1ff11)" }}
          >
            <span className="text-[24px]" style={{ color: "#00838f" }}>S</span>
          </div>
          <h3 className="text-[1rem] font-semibold text-foreground/80 mb-1">Henüz proje yok</h3>
          <p className="text-[0.82rem] text-muted-foreground mb-6">İlk projenizi oluşturarak başlayın</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[0.82rem] font-semibold text-white transition-all hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #00bcd4, #00acc1)", boxShadow: "0 1px 3px rgba(0,188,212,0.3)" }}
          >
            <Plus className="w-4 h-4" /> Proje Oluştur
          </button>
        </div>
      ) : (
        /* Project cards — 3 col grid */
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-card rounded-[14px] p-6 flex flex-col justify-between border border-black/4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-primary/20 transition-all no-underline min-h-[180px] cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[1rem] font-semibold text-foreground mb-1">{project.name}</div>
                <div className="text-[0.78rem] text-muted-foreground leading-relaxed line-clamp-2">
                  {project.description || "Açıklama eklenmemiş"}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-secondary">
                <div>
                  <div className="text-[1.1rem] font-bold text-foreground tabular-nums">
                    {(project as unknown as Record<string, number>).requirementCount ?? "—"}
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wide mt-0.5">Talep</div>
                </div>
                <div>
                  <div className="text-[1.1rem] font-bold text-foreground tabular-nums">
                    {(project as unknown as Record<string, number>).taskCount ?? "—"}
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wide mt-0.5">Task</div>
                </div>
                <div className="ml-auto text-[0.7rem] text-muted-foreground whitespace-nowrap">
                  {project.lastScannedAt ? timeAgo(project.lastScannedAt) : project.updatedAt ? timeAgo(project.updatedAt) : ""}
                </div>
              </div>
            </Link>
          ))}

          {/* New Project card */}
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded-[14px] p-6 flex flex-col items-center justify-center text-center border border-dashed border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all min-h-[180px] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg, #00bcd422, #00d1ff11)" }}
            >
              <Plus className="w-5 h-5" style={{ color: "#00838f" }} />
            </div>
            <div className="text-[0.82rem] font-semibold text-secondary-foreground">Yeni Proje Başlat</div>
            <div className="text-[0.72rem] text-muted-foreground mt-0.5">Kapsamı analiz edin</div>
          </button>
        </div>
      )}
    </div>
  );
}
