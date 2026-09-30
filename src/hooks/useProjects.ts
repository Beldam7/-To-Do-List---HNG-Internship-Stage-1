import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project, ProjectInsert } from '@/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setProjects(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const createProject = useCallback(async (input: ProjectInsert): Promise<Project | null> => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: input.name })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    setProjects((prev) => [...prev, data]);
    return data;
  }, []);

  const renameProject = useCallback(async (id: string, name: string): Promise<boolean> => {
    const { error } = await supabase.from('projects').update({ name }).eq('id', id);
    if (error) {
      setError(error.message);
      return false;
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    return true;
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return false;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  return { projects, loading, error, createProject, renameProject, deleteProject, reload: loadProjects };
}
