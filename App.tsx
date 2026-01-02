
import React, { useState, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  Sparkles, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  X,
  Pencil, 
  Trash2,
  Check,
  Target,
  PartyPopper,
  AlertTriangle,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2,
  Archive,
  Info,
  CalendarDays,
  Droplets,
  Dumbbell,
  BookOpen,
  Moon,
  Apple,
  Zap,
  Smile,
  Flame
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  parseISO, 
  addMonths, 
  subMonths, 
  isToday, 
  isWithinInterval, 
  startOfDay, 
  differenceInDays,
  min,
  endOfYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@supabase/supabase-js';
import { Habit, ViewType } from './types.ts';
import { getHabitSuggestions, getMotivationMessage } from './services/geminiService.ts';

// Supabase Config
const supabase = createClient(
  'https://nkfcuvblluhmxippddgz.supabase.co',
  'sb_publishable_loSQLxg4YO4rfy3Ol6pzlw_b_Ps9w8L'
);

// Componente de Logotipo
const Logo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
    <path d="M35 52 L48 65 L72 38" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AVAILABLE_ICONS = [
  { name: 'CheckCircle2', component: CheckCircle2 },
  { name: 'Target', component: Target },
  { name: 'Droplets', component: Droplets },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'BookOpen', component: BookOpen },
  { name: 'Moon', component: Moon },
  { name: 'Apple', component: Apple },
  { name: 'Zap', component: Zap },
  { name: 'Smile', component: Smile },
  { name: 'Flame', component: Flame },
];

const HabitIcon = ({ name, size = 22, ...props }: { name?: string, size?: number, [key: string]: any }) => {
  // @ts-ignore
  const IconComponent = LucideIcons[name] || CheckCircle2;
  return <IconComponent size={size} {...props} />;
};

const Confetti = () => {
  const pieces = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
  })), []);
  return <>{pieces.map(p => <div key={p.id} className="confetti" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, backgroundColor: p.color }} />)}</>;
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAuth, setProcessingAuth] = useState(false);

  const [view, setView] = useState<ViewType>('list');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIconName, setSelectedIconName] = useState('CheckCircle2');
  const [habitType, setHabitType] = useState<'ongoing' | 'period'>('ongoing');
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [motivation, setMotivation] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) fetchProfile(session.user.id);
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        setAuthSuccess(null);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (e) {
      console.warn("Public profile not yet available.");
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadHabits();
    }
  }, [session]);

  const loadHabits = async () => {
    if (!session?.user) return;
    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;

      const { data: completionsData, error: compError } = await supabase
        .from('completions')
        .select('habit_id, completed_date');

      if (compError) throw compError;

      const habitsWithCompletions = (habitsData || []).map((h: any) => ({
        ...h,
        completions: (completionsData || [])
          .filter((c: any) => c.habit_id === h.id)
          .map((c: any) => c.completed_date)
      }));

      setHabits(habitsWithCompletions);
    } catch (err) {
      console.error("Load habits error:", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingAuth(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { full_name: authName }
          }
        });
        
        if (error) throw error;

        if (data.user && !data.session) {
          setAuthSuccess("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setProcessingAuth(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHabits([]);
    setUserProfile(null);
    setView('list');
  };

  const saveHabit = async () => {
    if (!newHabitName.trim() || !session?.user) return;
    
    let finalStartDate = startDate;
    let finalEndDate = endDate;

    if (habitType === 'ongoing') {
      const now = new Date();
      finalStartDate = format(now, 'yyyy-MM-dd');
      finalEndDate = format(endOfYear(now), 'yyyy-MM-dd');
    }

    const habitData = {
      user_id: session.user.id,
      name: newHabitName,
      icon: selectedIconName,
      start_date: finalStartDate,
      end_date: finalEndDate,
      is_archived: false
    };

    if (editingHabitId) {
      await supabase.from('habits').update(habitData).eq('id', editingHabitId);
    } else {
      await supabase.from('habits').insert([{ ...habitData, color: 'bg-blue-600' }]);
    }

    await loadHabits();
    resetForm();
    setIsModalOpen(false);
  };

  const toggleDay = async (habitId: string, date: Date) => {
    if (!session?.user) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const isCompleted = habit.completions.includes(dateStr);

    if (isCompleted) {
      await supabase.from('completions').delete().eq('habit_id', habitId).eq('completed_date', dateStr);
    } else {
      const { error } = await supabase.from('completions').insert([{ 
        habit_id: habitId, user_id: session.user.id, completed_date: dateStr 
      }]);
      if (!error && isToday(date)) triggerCelebration(habit.name);
    }
    await loadHabits();
  };

  const archiveHabit = async (id: string, state: boolean) => {
    await supabase.from('habits').update({ is_archived: state }).eq('id', id);
    await loadHabits();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').delete().eq('id', id);
    await loadHabits();
    setConfirmingDeleteId(null);
  };

  const resetForm = () => {
    setNewHabitName('');
    setSelectedIconName('CheckCircle2');
    setHabitType('ongoing');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setEditingHabitId(null);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setNewHabitName(habit.name);
    setSelectedIconName(habit.icon || 'CheckCircle2');
    const now = new Date();
    const isCont = habit.end_date === format(endOfYear(now), 'yyyy-MM-dd');
    setHabitType(isCont ? 'ongoing' : 'period');
    setStartDate(habit.start_date || todayStr);
    setEndDate(habit.end_date || todayStr);
    setIsModalOpen(true);
  };

  const triggerCelebration = async (name: string) => {
    const msg = await getMotivationMessage(name);
    setMotivation(msg || "Parabéns por completar sua meta!");
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setMotivation(null);
    }, 4000);
  };

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await getHabitSuggestions(habits.filter(h => !h.is_archived).map(h => h.name));
      setAiSuggestions(suggestions);
    } catch (e) {
      console.error("Fail to fetch AI suggestions", e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const isHabitActiveOnDate = (habit: Habit, date: Date) => {
    const d = startOfDay(date);
    if (!habit.start_date) return true;
    const start = startOfDay(parseISO(habit.start_date));
    const end = habit.end_date ? startOfDay(parseISO(habit.end_date)) : null;
    if (end) return isWithinInterval(d, { start, end });
    return d >= start;
  };

  const calculateStats = (habit: Habit) => {
    const today = startOfDay(new Date());
    const start = startOfDay(parseISO(habit.start_date || habit.created_at));
    const effectiveEnd = habit.end_date ? min([today, startOfDay(parseISO(habit.end_date))]) : today;
    const totalActiveDays = Math.max(0, differenceInDays(effectiveEnd, start) + 1);
    const checks = habit.completions.length;
    const misses = Math.max(0, totalActiveDays - checks);
    const percent = totalActiveDays > 0 ? Math.round((checks / totalActiveDays) * 100) : 0;
    return { percent, checks, misses };
  };

  const activeHabitsToday = useMemo(() => habits.filter(h => !h.is_archived && isHabitActiveOnDate(h, new Date())), [habits]);
  const dailyProgress = useMemo(() => activeHabitsToday.length === 0 ? 0 : Math.round((activeHabitsToday.filter(h => h.completions.includes(todayStr)).length / activeHabitsToday.length) * 100), [activeHabitsToday, todayStr]);

  const greetingName = useMemo(() => {
    if (userProfile?.name) return userProfile.name;
    const metadataName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
    if (metadataName) return metadataName;
    return session?.user?.email?.split('@')[0] || 'usuário';
  }, [userProfile, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando sua rotina...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50" />
        <div className="w-full max-w-md bg-white rounded-[32px] p-10 shadow-xl border border-slate-100 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center mb-10">
            <Logo size={80} />
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-4 tracking-tighter">Constância+</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Nuvem Sincronizada</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" required placeholder="Seu Nome Completo" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={authName} onChange={e => setAuthName(e.target.value)} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" required placeholder="E-mail" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" required placeholder="Senha" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-top-1">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 animate-in slide-in-from-top-1">
                <Info size={14} className="shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <button disabled={processingAuth} type="submit" className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {processingAuth ? <Loader2 className="animate-spin" size={18} /> : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
              {!processingAuth && <ArrowRight size={18} />}
            </button>
          </form>
          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError(null);
                setAuthSuccess(null);
              }} 
              className="text-slate-500 text-xs font-bold hover:text-blue-600 transition-colors"
            >
              {authMode === 'login' ? 'Criar uma conta gratuita' : 'Já possui conta? Faça o Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50 max-w-md mx-auto relative overflow-x-hidden shadow-2xl font-sans text-slate-900">
      {showCelebration && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-blue-600/10 backdrop-blur-[2px] pointer-events-none"><Confetti /><div className="bg-white p-8 rounded-[32px] shadow-2xl border border-blue-100 flex flex-col items-center gap-4 max-w-[80%] text-center animate-pop-in pointer-events-auto"><div className="bg-emerald-100 p-4 rounded-full text-emerald-600 animate-bounce"><PartyPopper size={48} /></div><h2 className="text-2xl font-black text-slate-800 tracking-tight">Muito bom!</h2><p className="text-slate-600 font-medium leading-relaxed italic">{motivation}</p><button onClick={() => setShowCelebration(false)} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl">Continuar</button></div></div>}
      
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div><h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tighter">Constância+</h1><p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest -mt-1">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="p-3 text-slate-300 hover:text-rose-500 transition-colors"><LogOut size={20} /></button>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={20} /></button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {view === 'list' && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">HOJE</h2>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    Olá, <span className="text-blue-600 font-black">{greetingName}</span>!
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100"><div className="w-10 h-10 rounded-full border-2 border-blue-100 flex items-center justify-center relative"><svg className="w-full h-full -rotate-90"><circle cx="20" cy="20" r="16" fill="transparent" stroke="#eff6ff" strokeWidth="3" /><circle cx="20" cy="20" r="16" fill="transparent" stroke="#3b82f6" strokeWidth="3" strokeDasharray={100.5} strokeDashoffset={100.5 - (100.5 * dailyProgress) / 100} strokeLinecap="round" className="transition-all duration-1000" /></svg><span className="absolute text-[9px] font-black text-blue-600">{dailyProgress}%</span></div><span className="text-[9px] font-black text-slate-400 uppercase">DIA</span></div>
             </div>
             {activeHabitsToday.length === 0 ? <div className="text-center py-20 bg-white rounded-[24px] border border-dashed border-slate-200 shadow-sm"><Sparkles className="text-slate-200 mx-auto mb-4" size={24} /><h3 className="text-slate-800 font-bold">Sem metas hoje</h3></div> : <div className="space-y-3">
                 {activeHabitsToday.map(habit => {
                   const isDone = habit.completions.includes(todayStr);
                   return <button key={habit.id} onClick={() => toggleDay(habit.id, new Date())} className={`w-full group relative bg-white rounded-[20px] p-4 shadow-sm border transition-all flex items-center gap-4 active:scale-[0.98] ${isDone ? 'border-emerald-100 opacity-70 bg-slate-50/50' : 'border-slate-100'}`}><div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white ${isDone ? 'bg-slate-200 grayscale' : habit.color + ' shadow-lg shadow-current/20'}`}><HabitIcon name={habit.icon} size={24} /></div><div className="flex-1 text-left overflow-hidden"><h3 className={`font-bold text-base ${isDone ? 'text-slate-400' : 'text-slate-800'}`}>{habit.name}</h3>{isDone && <div className="absolute left-16 top-1/2 w-[calc(100%-120px)] h-[1px] bg-slate-300 animate-strike" />}</div><div className="shrink-0 relative w-8 h-8">{isDone ? <div className="bg-emerald-500 text-white rounded-lg flex items-center justify-center w-full h-full animate-check"><Check size={20} /></div> : <div className="border-2 border-slate-100 rounded-lg w-full h-full" />}</div></button>;
                 })}
               </div>}
          </div>
        )}

        {view === 'calendar' && <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm"><button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 text-slate-400"><ChevronLeft size={20} /></button><h2 className="font-black text-slate-700 uppercase tracking-tighter text-sm">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2><button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 text-slate-400"><ChevronRight size={20} /></button></div>
            <div className="grid grid-cols-7 gap-2">
              {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isTdy = isToday(day);
                const dayHabits = habits.filter(h => !h.is_archived && isHabitActiveOnDate(h, day));
                return <button key={dayStr} onClick={() => setSelectedDayDetail(day)} className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all ${isTdy ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'} active:scale-95`}>
                  <span className="text-xs font-bold">{format(day, 'd')}</span>
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {dayHabits.slice(0, 3).map(h => <div key={h.id} className={`w-1 h-1 rounded-full ${h.completions.includes(dayStr) ? h.color : 'bg-slate-200'}`} />)}
                  </div>
                </button>;
              })}
            </div>
          </div>}

        {view === 'manage' && <div className="space-y-6">
            <div className="flex bg-white p-2 rounded-xl shadow-sm border border-slate-100 gap-2"><button onClick={() => setShowArchived(false)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${!showArchived ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Ativas</button><button onClick={() => setShowArchived(true)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${showArchived ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Arquivadas</button></div>
            <div className="space-y-4">
              {habits.filter(h => h.is_archived === showArchived).map(habit => {
                const stats = calculateStats(habit);
                return <div key={habit.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${habit.color}`}><HabitIcon name={habit.icon} size={20} /></div><h3 className="font-bold text-sm">{habit.name}</h3></div><div className="flex gap-1"><button onClick={() => archiveHabit(habit.id, !habit.is_archived)} className="p-2 text-slate-300 hover:text-blue-500"><Archive size={18} /></button><button onClick={() => openEditModal(habit)} className="p-2 text-slate-300 hover:text-blue-500"><Pencil size={18} /></button><button onClick={() => setConfirmingDeleteId(habit.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button></div></div>
                  {confirmingDeleteId === habit.id && <div className="bg-rose-50 p-3 rounded-xl flex justify-between items-center"><span className="text-[10px] font-black text-rose-600 uppercase">Confirmar exclusão?</span><div className="flex gap-2"><button onClick={() => deleteHabit(habit.id)} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black">EXCLUIR</button><button onClick={() => setConfirmingDeleteId(null)} className="text-slate-400 text-[9px] font-black">CANCELAR</button></div></div>}
                  <div className="grid grid-cols-3 gap-2"><div className="bg-slate-50 p-2 rounded-xl text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Progresso</p><p className="font-black text-blue-600">{stats.percent}%</p></div><div className="bg-slate-50 p-2 rounded-xl text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Checks</p><p className="font-black text-emerald-600">{stats.checks}</p></div><div className="bg-slate-50 p-2 rounded-xl text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Faltas</p><p className="font-black text-rose-600">{stats.misses}</p></div></div>
                </div>;
              })}
            </div>
          </div>}

        {view === 'ai' && (
          <div className="space-y-6">
            <div className="bg-blue-600 rounded-[24px] p-7 text-white shadow-xl relative overflow-hidden">
              <Sparkles className="absolute -right-4 -top-4 opacity-20 w-32 h-32" />
              <h2 className="text-xl font-black mb-1">Assistente IA</h2>
              <p className="text-blue-100 text-xs font-medium">Receba sugestões personalizadas para sua rotina.</p>
              <button 
                onClick={fetchSuggestions} 
                disabled={isLoadingSuggestions} 
                className="mt-6 w-full py-4 bg-white text-blue-600 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoadingSuggestions ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isLoadingSuggestions ? 'GERANDO...' : 'BUSCAR NOVAS METAS'}
              </button>
            </div>
            
            <div className="space-y-3">
              {aiSuggestions.length === 0 && !isLoadingSuggestions && (
                <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm animate-in fade-in duration-500">
                  <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-slate-800 font-black text-sm uppercase tracking-tighter">Sua IA está pronta</h3>
                  <p className="text-slate-400 text-[11px] font-medium px-12 mt-1">Toque no botão acima para carregar dicas exclusivas para melhorar sua rotina mensal.</p>
                </div>
              )}
              
              {aiSuggestions.map((s, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="pr-4">
                    <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{s.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-[9px] font-black text-blue-600 uppercase">
                      <Target size={10} />
                      <span>{s.reason}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { resetForm(); setNewHabitName(s.name); setIsModalOpen(true); }} 
                    className="shrink-0 w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-4 flex justify-between items-center z-50 rounded-t-[32px] shadow-lg">
        <button onClick={() => setView('list')} className={`flex-1 flex flex-col items-center gap-1.5 ${view === 'list' ? 'text-blue-600' : 'text-slate-300'}`}><ListIcon size={22} /><span className="text-[8px] font-black">DIA</span></button>
        <button onClick={() => setView('calendar')} className={`flex-1 flex flex-col items-center gap-1.5 ${view === 'calendar' ? 'text-blue-600' : 'text-slate-300'}`}><CalendarIcon size={22} /><span className="text-[8px] font-black">MÊS</span></button>
        <button onClick={() => setView('manage')} className={`flex-1 flex flex-col items-center gap-1.5 ${view === 'manage' ? 'text-blue-600' : 'text-slate-300'}`}><Target size={22} /><span className="text-[8px] font-black">METAS</span></button>
        <button onClick={() => setView('ai')} className={`flex-1 flex flex-col items-center gap-1.5 ${view === 'ai' ? 'text-blue-600' : 'text-slate-300'}`}><Sparkles size={22} /><span className="text-[8px] font-black">DICAS</span></button>
      </nav>

      {selectedDayDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-6 animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-white rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">{format(selectedDayDetail, "dd 'de' MMMM", { locale: ptBR })}</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(selectedDayDetail, "EEEE", { locale: ptBR })}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDayDetail(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
              {habits.filter(h => !h.is_archived && isHabitActiveOnDate(h, selectedDayDetail)).length === 0 ? (
                <div className="text-center py-10">
                  <Info className="text-slate-200 mx-auto mb-2" size={24} />
                  <p className="text-slate-400 text-xs font-bold">Nenhuma meta ativa nesta data</p>
                </div>
              ) : (
                habits.filter(h => !h.is_archived && isHabitActiveOnDate(h, selectedDayDetail)).map(habit => {
                  const dateStr = format(selectedDayDetail, 'yyyy-MM-dd');
                  const isDone = habit.completions.includes(dateStr);
                  return (
                    <button 
                      key={habit.id} 
                      onClick={() => toggleDay(habit.id, selectedDayDetail)}
                      className={`w-full text-left p-4 rounded-2xl border flex items-center gap-3 transition-all active:scale-[0.97] ${isDone ? 'bg-slate-50 border-emerald-100 opacity-80' : 'bg-white border-slate-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isDone ? 'bg-slate-200' : habit.color}`}>
                        <HabitIcon name={habit.icon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{habit.name}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100'}`}>
                        {isDone && <Check size={14} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-6"><div className="w-full max-w-[340px] bg-white rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black">{editingHabitId ? 'Editar Meta' : 'Nova Meta'}</h2><button onClick={() => setIsModalOpen(false)} className="p-1.5 bg-slate-50 rounded-full text-slate-400"><X size={18} /></button></div><div className="space-y-5"><div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">TÍTULO</label><input type="text" placeholder="Ex: Beber 2L de água" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg outline-none text-sm font-bold" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} /></div><div><label className="text-[9px] font-black text-slate-400 uppercase block mb-2">ÍCONE</label><div className="grid grid-cols-4 gap-2">{AVAILABLE_ICONS.map(icon => <button key={icon.name} onClick={() => setSelectedIconName(icon.name)} className={`p-3 rounded-xl transition-all ${selectedIconName === icon.name ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}><icon.component size={20} /></button>)}</div></div><div><label className="text-[9px] font-black text-slate-400 uppercase block mb-2">TIPO</label><div className="flex gap-2"><button onClick={() => setHabitType('ongoing')} className={`flex-1 py-3 rounded-lg text-[10px] font-black border-2 ${habitType === 'ongoing' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-100 text-slate-400'}`}>Contínuo</button><button onClick={() => setHabitType('period')} className={`flex-1 py-3 rounded-lg text-[10px] font-black border-2 ${habitType === 'period' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-100 text-slate-400'}`}>Período</button></div></div>{habitType === 'period' && <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">INÍCIO</label><input type="date" className="w-full p-3 bg-slate-50 border rounded-lg text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">FIM</label><input type="date" className="w-full p-3 bg-slate-50 border rounded-lg text-xs" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></div></div>}<button onClick={saveHabit} className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2"><Check size={16} /> SALVAR</button></div></div></div>}
    </div>
  );
};

export default App;
