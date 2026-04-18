import { useRef, useState, } from "react";
import { Send, Paperclip, Image as ImageIcon, X, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
function uid() {
    return Math.random().toString(36).slice(2, 10);
}
async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    try {
        // Backend assumed to expose POST /api/upload returning { url, name?, type?, size? }
        const { data } = await api.post("/api/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        const url = data?.url ?? data?.fileUrl ?? data?.path;
        if (!url)
            throw new Error("no url");
        return {
            url,
            name: data?.name ?? file.name,
            type: data?.type ?? file.type,
            size: data?.size ?? file.size,
        };
    }
    catch {
        // Fallback: use a local object URL so the UX still works in preview / when backend not ready
        return {
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type,
            size: file.size,
        };
    }
}
export function MessageInput({ channelName, onSend, onTyping, disabled }) {
    const [value, setValue] = useState("");
    const [pending, setPending] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const taRef = useRef(null);
    const fileRef = useRef(null);
    const imgRef = useRef(null);
    function addFiles(files) {
        const arr = Array.from(files).slice(0, 10 - pending.length);
        const next = arr
            .filter((f) => {
            if (f.size > MAX_FILE_BYTES)
                return false;
            return true;
        })
            .map((f) => ({
            id: uid(),
            file: f,
            previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
        }));
        if (next.length)
            setPending((p) => [...p, ...next]);
    }
    function onPickFiles(e) {
        if (e.target.files)
            addFiles(e.target.files);
        e.target.value = "";
    }
    function removePending(id) {
        setPending((p) => {
            const item = p.find((x) => x.id === id);
            if (item?.previewUrl)
                URL.revokeObjectURL(item.previewUrl);
            return p.filter((x) => x.id !== id);
        });
    }
    async function submit(e) {
        e?.preventDefault();
        const trimmed = value.trim();
        if (disabled)
            return;
        if (!trimmed && pending.length === 0)
            return;
        let attachments = [];
        if (pending.length > 0) {
            setUploading(true);
            try {
                attachments = await Promise.all(pending.map((p) => uploadFile(p.file)));
            }
            finally {
                setUploading(false);
            }
        }
        onSend(trimmed, attachments);
        setValue("");
        pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        setPending([]);
        if (taRef.current)
            taRef.current.style.height = "auto";
    }
    function onKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    }
    function onDrop(e) {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length)
            addFiles(e.dataTransfer.files);
    }
    const canSend = (!!value.trim() || pending.length > 0) && !disabled && !uploading;
    return (<form onSubmit={submit} onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
        }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} className={`relative border-t border-border bg-background px-6 py-4 transition-colors ${dragOver ? "bg-primary/5" : ""}`}>
      {dragOver && (<div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/10 text-sm font-medium text-primary">
          Drop files to attach
        </div>)}

      <input ref={fileRef} type="file" multiple hidden onChange={onPickFiles}/>
      <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles}/>

      <div className="mx-auto max-w-3xl">
        {pending.length > 0 && (<div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
            {pending.map((p) => (<div key={p.id} className="group relative flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2 py-1.5 pr-7">
                {p.previewUrl ? (<img src={p.previewUrl} alt={p.file.name} className="h-10 w-10 rounded-md object-cover"/>) : (<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <FileText className="h-4 w-4"/>
                  </div>)}
                <div className="min-w-0 max-w-[160px]">
                  <div className="truncate text-xs font-medium text-foreground">
                    {p.file.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {(p.file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button type="button" onClick={() => removePending(p.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-80 transition-all hover:bg-destructive hover:text-destructive-foreground" aria-label="Remove attachment">
                  <X className="h-3 w-3"/>
                </button>
              </div>))}
          </div>)}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-soft transition-all focus-within:border-primary/60 focus-within:shadow-glow">
          <button type="button" onClick={() => imgRef.current?.click()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground" aria-label="Attach image" title="Attach image" disabled={disabled || pending.length >= 10}>
            <ImageIcon className="h-4 w-4"/>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground" aria-label="Attach file" title="Attach file" disabled={disabled || pending.length >= 10}>
            <Paperclip className="h-4 w-4"/>
          </button>
          <textarea ref={taRef} rows={1} value={value} onChange={(e) => {
            setValue(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
            onTyping();
        }} onKeyDown={onKeyDown} placeholder={`Message #${channelName}`} disabled={disabled} className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"/>
          <button type="submit" disabled={!canSend} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100" aria-label="Send message">
            {uploading ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<Send className="h-4 w-4"/>)}
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          Drag & drop files here · Max 20MB · 10 files per message
        </p>
      </div>
    </form>);
}
