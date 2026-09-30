import { useState, useRef, useEffect } from 'react';
import { Pin, PinOff, Trash2, MoreHorizontal } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onTogglePin: (note: Note) => void;
}

export function NoteCard({ note, onUpdate, onDelete, onTogglePin }: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSave = async () => {
    setSaving(true);
    const updates: { title?: string; content?: string } = {};
    if (title !== note.title) updates.title = title.trim();
    if (content !== note.content) updates.content = content;
    if (Object.keys(updates).length > 0) {
      await onUpdate(note.id, updates);
    }
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(note.title);
    setContent(note.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    await onDelete(note.id);
  };

  if (editing) {
    return (
      <div className={cn(
        'rounded-xl border bg-white dark:bg-slate-900 p-4 transition-all',
        note.pinned ? 'border-accent-300 dark:border-accent-800' : 'border-slate-200 dark:border-slate-800'
      )}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none mb-2"
        />
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="Start writing…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white dark:bg-slate-900 p-4 transition-all hover:shadow-sm cursor-pointer',
        note.pinned
          ? 'border-accent-300 dark:border-accent-800/60 bg-accent-50/30 dark:bg-accent-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      )}
      onClick={() => setEditing(true)}
    >
      {note.pinned && (
        <Pin size={14} className="absolute top-3 right-3 text-accent-500 fill-accent-500" />
      )}
      {note.title && (
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 pr-6">{note.title}</h3>
      )}
      {note.content && (
        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-6">{note.content}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(note.updated_at)}</span>
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-all"
            aria-label="Note actions"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-8 z-20 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 animate-fade-in">
              <button
                onClick={() => { setMenuOpen(false); onTogglePin(note); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                {note.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
