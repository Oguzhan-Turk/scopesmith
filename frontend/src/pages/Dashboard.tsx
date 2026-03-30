import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects, createProject, type Project } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
          <h1 className="text-3xl font-bold tracking-tight">Projeler</h1>
          <p className="text-muted-foreground mt-1">
            Ham talebi yapılandırılmış analize dönüştürün
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>+ Yeni Proje</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Proje Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <input
                type="text"
                placeholder="Proje adı"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                autoFocus
              />
              <textarea
                placeholder="Açıklama (opsiyonel)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md bg-background resize-none"
              />
              <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "var(--gradient-brand)" }}>
              🎯
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Henüz proje yok</p>
              <p className="text-sm text-muted-foreground">İlk projenizi oluşturarak başlayın</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>+ İlk Projenizi Oluşturun</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </CardTitle>
                    {project.hasContext ? (
                      <Badge variant="default" className="shrink-0">Context Hazır</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Context Yok</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
                      {project.requirementCount} talep
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                      {project.documentCount} belge
                    </span>
                    {project.lastScannedAt && (
                      <span>
                        {new Date(project.lastScannedAt).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
