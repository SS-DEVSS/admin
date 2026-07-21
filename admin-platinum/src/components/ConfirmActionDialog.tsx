import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  consequences?: string[];
  confirmWord?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
};

const ConfirmActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  consequences = [],
  confirmWord = "Confirmar",
  confirmLabel = "Eliminar",
  loading = false,
  error = null,
  onConfirm,
}: ConfirmActionDialogProps) => {
  const [inputValue, setInputValue] = useState("");

  const isConfirmed = inputValue.trim() === confirmWord;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInputValue("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {consequences.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium mb-2">Esta acción tendrá las siguientes consecuencias:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Escribe <span className="font-semibold text-foreground">{confirmWord}</span> para continuar.
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmWord}
            disabled={loading}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!isConfirmed || loading}
            onClick={() => void onConfirm()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmActionDialog;
