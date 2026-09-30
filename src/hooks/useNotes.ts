import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Note } from '@/types';

interface NoteInsert {
  title?: string;
  content?: string;
  pinned?: boolean;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (queryError) {
      setError(queryError.message);
    } else {
      setNotes(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (input: NoteInsert): Promise<Note | null> => {
    const { data, error: insertError } = await supabase
      .from('notes')
      .insert({
        title: input.title || '',
        content: input.content || '',
        pinned: input.pinned || false,
      })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return null;
    }
    setNotes((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateNote = useCallback(async (id: string, updates: Partial<NoteInsert>): Promise<boolean> => {
    const { error: updateError } = await supabase.from('notes').update(updates).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setNotes((prev) =>
      prev
        .map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    );
    return true;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase.from('notes').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    return true;
  }, []);

  const togglePin = useCallback(async (note: Note): Promise<void> => {
    const pinned = !note.pinned;
    setNotes((prev) =>
      prev
        .map((n) => (n.id === note.id ? { ...n, pinned } : n))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    );
    await supabase.from('notes').update({ pinned }).eq('id', note.id);
  }, []);

  return { notes, loading, error, createNote, updateNote, deleteNote, togglePin, reload: loadNotes };
}
