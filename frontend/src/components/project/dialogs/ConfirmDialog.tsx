import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  dialog: { message: string; onConfirm: () => void } | null;
  onClose: () => void;
}

export default function ConfirmDialog({ dialog, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onay</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dialog?.message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={onClose}>İptal</Button>
          <Button size="sm" onClick={() => { dialog?.onConfirm(); onClose(); }}>Onayla</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
