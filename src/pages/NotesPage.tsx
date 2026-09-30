import { useState } from 'react';
import { StickyNote, Plus, Loader2 } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import { NoteCard } from '@/components/notes/NoteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/Toast';

export function NotesPage() {
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const result = await createNote({ title: '', content: '' });
    setCreating(false);
    if (!result) {
      showToast('Could not create note. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const success = await deleteNote(id);
    if (success) showToast('Note deleted', 'success');
    return success;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
            <StickyNote size={16} />
            <span>Notes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Notes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Jot down ideas, reminders, and anything else.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 active:bg-accent-800 transition-colors disabled:opacity-50 touch-manipulation"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          New note
        </button>
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={28} />}
          title="No notes yet."
          description="Create a note to jot down ideas, reminders, or anything you want to remember."
          action={
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
            >
              <Plus size={16} /> Create note
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={handleDelete}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
