import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { getProjects, createProject, type Project } from "@/api/client";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projeler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Taleplerinizi analiz edin, task'lara dönüştürün
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Yeni Proje
        </Button>
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
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="w-full px-3 py-2 border rounded-md bg-background resize-none text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white text-lg font-bold" style={{ background: "var(--gradient-brand)" }}>
            S
          </div>
          <p className="font-medium mb-1">Henüz proje yok</p>
          <p className="text-sm text-muted-foreground mb-4">İlk projenizi oluşturarak başlayın</p>
          <Button onClick={() => setDialogOpen(true)}>+ Proje Oluştur</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Proje</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Aciklama</th>
                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3 w-32">Son Aktivite</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="block">
                      <span className="text-sm font-medium hover:text-foreground transition-colors">{project.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link to={`/projects/${project.id}`} className="block">
                      <span className="text-sm text-muted-foreground line-clamp-1">{project.description || "—"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/projects/${project.id}`} className="block">
                      <span className="text-xs text-muted-foreground">
                        {project.lastScannedAt ? timeAgo(project.lastScannedAt) : project.updatedAt ? timeAgo(project.updatedAt) : "—"}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
