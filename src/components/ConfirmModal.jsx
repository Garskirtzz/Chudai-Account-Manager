import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./Primitives";

export default function ConfirmModal({
  buka,
  judul,
  pesan,
  labelYa = "Continue",
  bahaya = false,
  onYa,
  onTutup,
}) {
  return (
    <Modal
      buka={buka}
      onTutup={onTutup}
      judul={judul}
      ikon={bahaya ? AlertTriangle : HelpCircle}
      lebar="w-[420px]"
      anakKaki={
        <>
          <Button variant="ghost" onClick={onTutup}>
            Cancel
          </Button>
          <Button
            variant={bahaya ? "destroy" : "primary"}
            onClick={onYa}
            className="px-4"
          >
            {labelYa}
          </Button>
        </>
      }
    >
      <p className="text-meta leading-5 whitespace-pre-line text-zinc-400">
        {pesan}
      </p>
    </Modal>
  );
}
