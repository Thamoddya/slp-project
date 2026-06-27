import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2, ImagePlus, Loader2, Utensils } from "lucide-react";
import repo from "@/data/repo";
import { compressImage, uploadImage } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LatLng } from "@/types";

interface RequestDansalModalProps {
  onClose: () => void;
  userPos?: LatLng | null;
}

export default function RequestDansalModal({ onClose, userPos }: RequestDansalModalProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [date, setDate] = useState("");
  const [contact, setContact] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImgBusy(true);
    try {
      setImage(await compressImage(file));
    } catch {
      /* ignore */
    } finally {
      setImgBusy(false);
    }
  };

  const canSubmit = name.trim() && !busy && !imgBusy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      // Upload to a free host (or keep base64 if no host configured).
      const imageUrl = image ? await uploadImage(image) : "";
      await repo.report({
        kind: "dansal_request",
        name_en: name.trim(),
        name_si: name.trim(),
        openHours: openHours.trim(),
        date,
        contact: contact.trim(),
        image: imageUrl,
        lat: userPos?.lat,
        lng: userPos?.lng,
        status: "pending",
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-navy-950/55 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-sheet animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cream-300" />
          <button
            onClick={onClose}
            aria-label={t("more.close")}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-cream-100"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-600">
              <Utensils className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-navy-900">{t("request.title")}</h2>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-center text-base font-semibold text-navy-900">{t("request.thanks")}</p>
            <Button className="w-full" onClick={onClose}>OK</Button>
          </div>
        ) : (
          <>
            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <p className="text-xs leading-relaxed text-muted-foreground">{t("request.subtitle")}</p>

              <Field label={t("request.name")}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("request.namePlaceholder")} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("request.time")}>
                  <Input value={openHours} onChange={(e) => setOpenHours(e.target.value)} placeholder="6am – 10pm" />
                </Field>
                <Field label={t("request.date")}>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>

              <Field label={t("request.contact")}>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="07X XXX XXXX" inputMode="tel" />
              </Field>

              {/* Image proof */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("request.proof")}</Label>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
                {image ? (
                  <div className="relative overflow-hidden rounded-xl border border-cream-200">
                    <img src={image} alt="proof" className="max-h-52 w-full object-cover" />
                    <button
                      onClick={() => setImage(null)}
                      className="absolute right-2 top-2 rounded-full bg-navy-950/60 p-1.5 text-white hover:bg-navy-950/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={imgBusy}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 px-4 py-6 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-200"
                  >
                    {imgBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    {imgBusy ? t("request.processing") : t("request.addProof")}
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground">{t("request.proofHint")}</p>
              </div>
            </div>

            {/* Submit */}
            <div
              className="shrink-0 border-t border-cream-200 px-6 py-4"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            >
              <Button size="lg" variant="saffron" className="w-full" disabled={!canSubmit} onClick={submit}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("request.submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
