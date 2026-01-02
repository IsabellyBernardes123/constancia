
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  is_archived: boolean;
  // Carregado via join ou mapeado separadamente
  completions: string[]; 
}

export type ViewType = 'list' | 'calendar' | 'ai' | 'manage';
