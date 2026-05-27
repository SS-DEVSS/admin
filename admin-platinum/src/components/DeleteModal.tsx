import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { useDeleteModal } from "@/context/delete-context";

const DeleteModal = () => {
  const { modalState, closeModal } = useDeleteModal();
  const { isOpen, title, description, handleDelete } = modalState;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => !open && closeModal()}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="mb-2">Eliminar {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={closeModal} variant="outline">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (handleDelete) {
                handleDelete();
              }
              closeModal();
            }}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;
