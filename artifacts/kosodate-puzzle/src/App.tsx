import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Baby,
  Bath,
  BedDouble,
  BusFront,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudRain,
  Droplets,
  ExternalLink,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  ShoppingCart,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
  UsersRound,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// 楽天ROOM（アフィリエイト）。リンク先で購入があると運営者に紹介料が入る
const RAKUTEN_ROOM_URL = 'https://room.rakuten.co.jp/room_3f23688527/items';

type Child = { id: string; name: string; ageMonths: number; capabilities: string[] };
type Place = { id: string; name: string; type: string };
type TransportOption = { id: string; name: string; iconKey: string };
type FamilySettings = { homeName: string; children: Child[]; places: Place[]; transportOptions: TransportOption[] };
type Task = { id: string; title: string; durationMinutes: number; assignee: string; location: string; status: 'todo' | 'done'; optional?: boolean; dependsOn?: string[]; alternatives?: string[]; canPause?: boolean; parallelGroup?: string; priority?: number };
type Scene = { id: string; name: string; shortDescription: string; accent: string; icon: typeof Sun };
type Situation = { id: string; label: string; description: string; icon: typeof CloudRain };

const queryClient = new QueryClient();
const STORAGE_KEY = 'kosodate-puzzle-family-v1';
const TASKS_STORAGE_KEY = 'kosodate-puzzle-tasks-v1';

const scenes: Scene[] = [
  { id: 'morning', name: '朝の外出', shortDescription: '家を出るまでの段取り', accent: 'coral', icon: Sun },
  { id: 'meal', name: '食事', shortDescription: '食べる・片づける', accent: 'ochre', icon: Utensils },
  { id: 'bath', name: 'お風呂', shortDescription: '湯上がりまでを整える', accent: 'mint', icon: Bath },
  { id: 'sleep', name: '寝かしつけ', shortDescription: '眠りに向かう時間', accent: 'navy', icon: BedDouble },
  { id: 'chores', name: '家事', shortDescription: '合間に進める家のこと', accent: 'ochre', icon: ShoppingCart },
];

const situations: Situation[] = [
  { id: 'rain', label: '雨が降ってきた', description: '外の移動を少なくして、雨具の準備を足します。', icon: CloudRain },
  { id: 'fussy', label: 'ひとりがぐずっている', description: '抱っこや小休憩を優先する順番に組み替えます。', icon: Baby },
  { id: 'asleep', label: 'ひとりが寝てしまった', description: '起こさない前提で、静かにできる作業へ。', icon: BedDouble },
  { id: 'delay', label: '出発が遅れている', description: '今すぐ必要なことだけに絞り込みます。', icon: Clock3 },
];

const demoFamily: FamilySettings = {
  homeName: 'わが家',
  children: [
    { id: 'child-1', name: 'あおい', ageMonths: 40, capabilities: ['自分で靴をはく', 'トイレに行ける', '短い説明がわかる'] },
    { id: 'child-2', name: 'ゆい', ageMonths: 17, capabilities: ['手をつないで歩く', 'スプーンを使う', '眠いサインがある'] },
  ],
  places: [
    { id: 'place-home', name: '自宅', type: 'home' },
    { id: 'place-nursery', name: 'ひだまり保育園', type: 'nursery' },
    { id: 'place-station', name: '駅', type: 'station' },
    { id: 'place-park', name: '近所の公園', type: 'park' },
  ],
  transportOptions: [
    { id: 'walk', name: '徒歩', iconKey: 'walk' },
    { id: 'bike', name: '自転車', iconKey: 'bike' },
    { id: 'car', name: '車', iconKey: 'car' },
  ],
};

const seedTasks: Record<string, Task[]> = {
  morning: [
    { id: 'm-1', title: '朝ごはんを食べる', durationMinutes: 15, assignee: 'あおいとゆい', location: '自宅', status: 'done', canPause: false },
    { id: 'm-2', title: '連絡帳と水筒をバッグへ', durationMinutes: 4, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 'm-3', title: 'あおいの着替え・靴', durationMinutes: 7, assignee: 'あおい', location: '自宅', status: 'todo', alternatives: ['自分でできるところまで見守る'], canPause: true },
    { id: 'm-4', title: 'ゆいの着替え・おむつ', durationMinutes: 8, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false },
    { id: 'm-5', title: '玄関で人数と忘れものを確認', durationMinutes: 3, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false },
    { id: 'm-6', title: 'ひだまり保育園へ移動', durationMinutes: 12, assignee: '全員', location: 'ひだまり保育園', status: 'todo', optional: true, alternatives: ['雨の日は車に切り替える'], canPause: false },
  ],
  meal: [
    { id: 'me-1', title: '手を洗う・席につく', durationMinutes: 4, assignee: '全員', location: '自宅', status: 'todo', canPause: true },
    { id: 'me-2', title: '食事を温めて配膳する', durationMinutes: 8, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 'me-3', title: 'あおいの食べ始めを見守る', durationMinutes: 15, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 'me-4', title: 'ゆいのひと口目を手伝う', durationMinutes: 10, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false },
    { id: 'me-5', title: '食器を下げて口を拭く', durationMinutes: 5, assignee: '全員', location: '自宅', status: 'todo', optional: true, canPause: true },
  ],
  bath: [
    { id: 'b-1', title: '着替えとタオルを出す', durationMinutes: 4, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 'b-2', title: 'あおいを先に洗う', durationMinutes: 8, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 'b-3', title: 'ゆいを受け取って温める', durationMinutes: 7, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false },
    { id: 'b-4', title: '保湿・パジャマ', durationMinutes: 9, assignee: '全員', location: '自宅', status: 'todo', canPause: true },
  ],
  sleep: [
    { id: 's-1', title: '照明を落として水分を用意', durationMinutes: 3, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true },
    { id: 's-2', title: 'ゆいの絵本を一冊読む', durationMinutes: 8, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false },
    { id: 's-3', title: 'あおいの明日の話を聞く', durationMinutes: 10, assignee: 'あおい', location: '自宅', status: 'todo', canPause: true },
    { id: 's-4', title: 'おやすみの合図を決める', durationMinutes: 2, assignee: '全員', location: '自宅', status: 'todo', canPause: false },
  ],
  chores: [
    { id: 'h-1', title: '洗濯機を回す', durationMinutes: 5, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false, parallelGroup: 'housework-start', priority: 1 },
    { id: 'h-2', title: '料理の下ごしらえ', durationMinutes: 12, assignee: 'おとな', location: '自宅', status: 'todo', canPause: true, parallelGroup: 'housework-start', priority: 1 },
    { id: 'h-3', title: 'オムツを替える', durationMinutes: 6, assignee: 'おとな', location: '自宅', status: 'todo', canPause: false, priority: 2 },
    { id: 'h-4', title: '洗濯物を干す', durationMinutes: 12, assignee: 'おとな', location: 'ベランダ', status: 'todo', dependsOn: ['h-1'], canPause: true, priority: 3 },
    { id: 'h-5', title: 'ゴミ出し', durationMinutes: 5, assignee: 'おとな', location: 'ごみ置き場', status: 'todo', canPause: false, priority: 4 },
    { id: 'h-6', title: '段ボールをまとめる', durationMinutes: 10, assignee: 'おとな', location: '自宅', status: 'todo', optional: true, canPause: true, priority: 5 },
    { id: 'h-7', title: '買い物メモを作る', durationMinutes: 8, assignee: 'おとな', location: '自宅', status: 'todo', optional: true, canPause: true, parallelGroup: 'errands', priority: 6 },
    { id: 'h-8', title: '買い物に行く', durationMinutes: 25, assignee: 'おとな', location: '近所の店', status: 'todo', dependsOn: ['h-7'], canPause: false, priority: 7 },
    { id: 'h-9', title: 'おとなが15分横になる', durationMinutes: 15, assignee: 'おとな', location: '自宅', status: 'todo', optional: true, canPause: false, priority: 8 },
  ],
};

function loadFamily(): FamilySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as FamilySettings : demoFamily;
  } catch {
    return demoFamily;
  }
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return typeof task.id === 'string'
    && typeof task.title === 'string'
    && typeof task.durationMinutes === 'number' && Number.isFinite(task.durationMinutes)
    && typeof task.assignee === 'string'
    && typeof task.location === 'string'
    && (task.status === 'todo' || task.status === 'done');
}

// 保存済みのタスクを読み込み、あとから増えた初期タスクは id で補う
function loadTasks(): Record<string, Task[]> {
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!saved) return seedTasks;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return seedTasks;
    const savedScenes = parsed as Record<string, unknown>;
    const merged: Record<string, Task[]> = {};
    Object.keys(seedTasks).forEach((sceneKey) => {
      const savedList = savedScenes[sceneKey];
      if (!Array.isArray(savedList)) {
        merged[sceneKey] = seedTasks[sceneKey];
        return;
      }
      const validTasks = savedList.filter(isTask);
      const savedIds = new Set(validTasks.map((task) => task.id));
      merged[sceneKey] = [...validTasks, ...seedTasks[sceneKey].filter((task) => !savedIds.has(task.id))];
    });
    return merged;
  } catch {
    return seedTasks;
  }
}

// taskId に直接・間接に依存しているタスクの id をすべて集める
function collectDependents(taskList: Task[], taskId: string): Set<string> {
  const found = new Set<string>();
  const queue = [taskId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    taskList.forEach((task) => {
      if (task.id !== taskId && !found.has(task.id) && currentId && task.dependsOn?.includes(currentId)) {
        found.add(task.id);
        queue.push(task.id);
      }
    });
  }
  return found;
}

function ageLabel(months: number) {
  return months < 24 ? `${months}か月` : `${Math.floor(months / 12)}歳${months % 12 ? `${months % 12}か月` : ''}`;
}

type TaskLane = { id: string; label?: string; tasks: Task[]; minutes: number };

function buildLanes(taskList: Task[]): TaskLane[] {
  const lanes: TaskLane[] = [];
  const grouped = new Map<string, TaskLane>();
  taskList.forEach((task) => {
    const laneId = task.parallelGroup ?? `single-${task.id}`;
    if (!grouped.has(laneId)) {
      const lane = { id: laneId, label: task.parallelGroup ? '同時に進める' : undefined, tasks: [], minutes: 0 };
      grouped.set(laneId, lane);
      lanes.push(lane);
    }
    const lane = grouped.get(laneId);
    if (!lane) return;
    lane.tasks.push(task);
    lane.minutes = Math.max(lane.minutes, task.status === 'done' ? 0 : task.durationMinutes);
  });
  // 同じグループのタスクが1件だけなら、並行レーンではなく通常の行として扱う
  return lanes.map((lane) => lane.label && lane.tasks.length < 2 ? { ...lane, label: undefined } : lane);
}

function parallelMinutes(taskList: Task[]) {
  return buildLanes(taskList).reduce((sum, lane) => sum + lane.minutes, 0);
}

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" aria-label={label} data-testid={`button-${label}`} className={`icon-button ${className}`} onClick={onClick}>{children}</button>;
}

// 家族またはタスクの保存データがあれば、初回起動ではない
function hasSavedData() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(TASKS_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function App() {
  const [family, setFamily] = useState<FamilySettings>(loadFamily);
  const [sceneId, setSceneId] = useState('morning');
  const [tasks, setTasks] = useState<Record<string, Task[]>>(loadTasks);
  const [activeSituation, setActiveSituation] = useState<Situation | null>(null);
  const [showFamily, setShowFamily] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState(() => hasSavedData() ? '' : 'demo');
  const [replanVersion, setReplanVersion] = useState(0);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(family));
    } catch {
      // 保存できない環境（容量不足・プライベートモードなど）でも画面は使えるようにする
    }
  }, [family]);

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // 同上
    }
  }, [tasks]);

  // 通知は数秒で消し、ボタンを隠したままにしない
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const scene = scenes.find((item) => item.id === sceneId) ?? scenes[0];
  const sceneTasks = tasks[sceneId] ?? [];
  const doneCount = sceneTasks.filter((task) => task.status === 'done').length;
  const sequentialMinutes = sceneTasks.reduce((sum, task) => task.status === 'done' ? sum : sum + task.durationMinutes, 0);
  const visibleMinutes = sceneId === 'chores' ? parallelMinutes(sceneTasks) : sequentialMinutes;

  const changeScene = (id: string) => {
    setSceneId(id);
    setNotice('');
  };

  const toggleTask = (taskId: string) => {
    const currentTasks = tasks[sceneId] ?? [];
    const target = currentTasks.find((task) => task.id === taskId);
    if (!target) return;
    if (target.status === 'todo') {
      if (target.dependsOn?.some((dependencyId) => currentTasks.find((task) => task.id === dependencyId)?.status !== 'done')) {
        setNotice('dependency');
        return;
      }
      setTasks((current) => ({
        ...current,
        [sceneId]: (current[sceneId] ?? []).map((task) => task.id === taskId ? { ...task, status: 'done' } : task),
      }));
      return;
    }
    // 未完了に戻すときは、後に続く完了済みの作業もいっしょに戻す
    const dependents = collectDependents(currentTasks, taskId);
    const reopenedDependents = currentTasks.filter((task) => dependents.has(task.id) && task.status === 'done').length;
    setTasks((current) => ({
      ...current,
      [sceneId]: (current[sceneId] ?? []).map((task) => task.id === taskId || dependents.has(task.id) ? { ...task, status: 'todo' } : task),
    }));
    if (reopenedDependents > 0) setNotice('dependents-reset');
  };

  const replan = (situation: Situation) => {
    setActiveSituation(null);
    setReplanVersion((value) => value + 1);
    setNotice(situation.id === 'rain' ? 'rain' : situation.id === 'delay' ? 'delay' : 'replanned');
    setTasks((current) => {
      const next = { ...current };
      if (situation.id === 'rain') {
        next.morning = (next.morning ?? []).map((task) => task.title.includes('移動') ? { ...task, title: '車でひだまり保育園へ移動', durationMinutes: 9 } : task);
      }
      if (situation.id === 'delay') {
        next.morning = (next.morning ?? []).map((task) => task.optional ? { ...task, status: 'done' } : task);
      }
      if (sceneId === 'chores') {
        const chores = [...(next.chores ?? [])];
        if (situation.id === 'fussy') {
          next.chores = chores.map((task) => task.title.includes('オムツ') ? { ...task, priority: 1, parallelGroup: undefined } : task.title === '洗濯機を回す' || task.title === '料理の下ごしらえ' ? { ...task, priority: 2, parallelGroup: undefined } : task).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        } else if (situation.id === 'asleep') {
          next.chores = chores.map((task) => task.title === '料理の下ごしらえ' || task.title === '洗濯機を回す' ? { ...task, parallelGroup: 'quiet-start', priority: 1 } : task).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        } else if (situation.id === 'delay') {
          next.chores = chores.map((task) => task.optional ? { ...task, priority: 90 } : { ...task, priority: task.title.includes('オムツ') ? 1 : 2 }).sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        }
      }
      return next;
    });
  };

  const addTask = (task: Omit<Task, 'id' | 'status'>) => {
    const newTask: Task = { ...task, id: `${sceneId}-${Date.now()}`, status: 'todo' };
    setTasks((current) => ({ ...current, [sceneId]: [...(current[sceneId] ?? []), newTask] }));
    setShowTaskForm(false);
    setNotice('task-added');
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><div className="brand-name">こそだて<span>パズル</span></div><div className="brand-caption">家族の段取りを、ひとつずつ。</div></div>
        </div>
        <div className="sidebar-family">
          <div className="eyebrow">いまの家族</div>
          <div className="family-chip"><span className="family-avatar"><UsersRound size={16} /></span><span>{family.homeName}</span><ChevronDown size={15} /></div>
        </div>
        <nav className="side-nav" aria-label="メインナビゲーション">
          <button className="side-nav-item active" type="button" data-testid="nav-today"><CalendarDays size={18} /><span>今日のボード</span><span className="nav-count">{doneCount}/{sceneTasks.length}</span></button>
          <button className="side-nav-item" type="button" onClick={() => setShowFamily(true)} data-testid="nav-family"><UsersRound size={18} /><span>家族プロフィール</span></button>
          <button className="side-nav-item" type="button" onClick={() => setShowFamily(true)} data-testid="nav-settings"><Settings2 size={18} /><span>わが家の設定</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note"><Sparkles size={16} /><span>暮らしに合わせて<br />いつでも組み替えられます</span></div>
          <button className="help-link" type="button" data-testid="button-help"><CircleHelp size={16} />使い方を見る</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileNav((open) => !open)} aria-label="メニュー"><Menu size={22} /></button>
          <div className="breadcrumb"><span>今日のボード</span><ArrowRight size={14} /><strong>{scene.name}</strong></div>
          <div className="top-actions"><span className="saved-state"><span className="saved-dot" />この端末に保存中</span><IconButton label="家族プロフィールを編集" onClick={() => setShowFamily(true)}><div className="mini-avatars">{family.children.slice(0, 2).map((child) => <span key={child.id}>{child.name.slice(0, 1)}</span>)}</div><Pencil size={14} /></IconButton></div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div><div className="date-line"><span className="date-pill">火曜日</span><span>2025年 6月 17日</span></div><h1>今日は、<em>どう動く？</em></h1><p className="intro-copy">今の家族の状態に合わせて、無理のない順番を組み立てます。</p></div>
            <div className="weather-card"><Sun size={22} /><div><strong>くもりのち晴れ</strong><span>25° / 18°　外出しやすそう</span></div><MoreHorizontal size={19} /></div>
          </section>

          <section className="scene-tabs" aria-label=" routine scenes">
            {scenes.map((item) => {
              const Icon = item.icon;
              const count = (tasks[item.id] ?? []).filter((task) => task.status === 'done').length;
              return <button type="button" key={item.id} onClick={() => changeScene(item.id)} className={`scene-tab ${sceneId === item.id ? 'selected' : ''} scene-${item.accent}`} data-testid={`tab-scene-${item.id}`}><span className="scene-icon"><Icon size={19} /></span><span className="scene-copy"><strong>{item.name}</strong><small>{item.shortDescription}</small></span><span className="scene-progress">{count}/{(tasks[item.id] ?? []).length}</span></button>;
            })}
          </section>

          <div className="content-grid">
            <section className="board-card">
              <div className="board-header">
                <div><div className="eyebrow coral-text">今日の組み立て</div><h2>{scene.name}<span className="board-subtitle"> / {scene.shortDescription}</span></h2></div>
                <button type="button" className="outline-button" onClick={() => setActiveSituation(situations[3])} data-testid="button-replan"><RefreshCw size={15} />状況が変わったら</button>
              </div>
               <div className="plan-meta">
                 <span className={sceneId === 'chores' ? 'parallel-summary' : ''}><Clock3 size={15} />{sceneId === 'chores' ? `並行すると約${visibleMinutes}分` : `残り 約${visibleMinutes}分`}</span>
                 {sceneId === 'chores' && <span className="sequential-summary">順番なら約{sequentialMinutes}分</span>}
                 <span className="plan-origin"><MapPin size={15} />{family.homeName}を起点に作成</span>
                 <span className="meta-note">{sceneId === 'chores' ? '重ねられる家事は、ひとつのレーンに' : '最初から完璧じゃなくて大丈夫'}</span>
               </div>
               <div className={`task-list ${sceneId === 'chores' ? 'task-list-chores' : ''}`} data-testid={`task-list-${sceneId}`}>
                 {sceneTasks.length === 0 ? <div className="empty-state"><Sparkles size={26} /><strong>この場面の予定はまだありません</strong><span>家族のペースに合わせて、あとから追加できます。</span></div> : sceneId === 'chores' ? <ChoreLanes tasks={sceneTasks} replanVersion={replanVersion} onToggle={toggleTask} /> : sceneTasks.map((task, index) => <TaskRow key={`${task.id}-${replanVersion}`} task={task} index={index} onToggle={() => toggleTask(task.id)} />)}
              </div>
               {sceneId === 'chores' && <div className="parallel-note" data-testid="text-parallel-explanation"><span className="parallel-mark" />同時に進める家事は、長いほうの時間だけで見積もっています</div>}
               <div className="board-footer"><button type="button" className="soft-button" onClick={() => setShowTaskForm(true)} data-testid="button-add-task"><Plus size={16} />やることを足す</button><span>順番は、その日の状態に合わせて変えられます</span></div>
            </section>

            <aside className="right-rail">
              <div className="situation-card">
                <div className="card-kicker"><span className="sunny-dot" /><span>状況を入れ替える</span></div>
                <h3>予定どおりに<br /><em>いかないときも</em></h3>
                <p>今の様子を教えてください。<br />家族に合う順番に組み替えます。</p>
                <div className="situation-buttons">{situations.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => setActiveSituation(item)} data-testid={`button-situation-${item.id}`}><Icon size={17} /><span>{item.label}</span><ArrowRight size={14} /></button>; })}</div>
              </div>
              <div className="family-snapshot">
                <div className="snapshot-title"><span>家族のメモ</span><IconButton label="家族のメモを編集" onClick={() => setShowFamily(true)}><Pencil size={14} /></IconButton></div>
                <div className="children-list">{family.children.map((child, index) => <div className="child-line" key={child.id}><span className={`child-avatar child-${index}`}>{child.name.slice(0, 1)}</span><div><strong>{child.name}</strong><span>{ageLabel(child.ageMonths)}・{child.capabilities[0] ?? '様子を見ながら'}</span></div><span className="child-status">{index === 0 ? '元気' : '眠そう'}</span></div>)}</div>
                <button type="button" className="text-button" onClick={() => setShowFamily(true)} data-testid="button-edit-family">プロフィールを整える <ArrowRight size={14} /></button>
              </div>
              <RoomPick onShowPolicy={() => setShowPrivacy(true)} />
              <div className="transport-note"><RouteIcon size={18} /><div><strong>移動手段</strong><span>{family.transportOptions.map((option) => option.name).join('・')}</span></div><button type="button" onClick={() => setShowFamily(true)} aria-label="移動手段を編集" data-testid="button-edit-transport"><Pencil size={14} /></button></div>
            </aside>
          </div>
          <footer className="page-footer"><span><Droplets size={14} />家族とやることのデータは、この端末だけに保存されています</span><span className="footer-links"><button type="button" onClick={() => setShowPrivacy(true)} data-testid="button-privacy">プライバシーと広告について</button><span>こそだてパズル β版</span></span></footer>
        </div>
      </main>

      {activeSituation && <SituationModal situation={activeSituation} onClose={() => setActiveSituation(null)} onReplan={() => replan(activeSituation)} />}
      {showFamily && <FamilyModal family={family} onClose={() => setShowFamily(false)} onSave={(next) => { setFamily(next); setShowFamily(false); setNotice('family-saved'); }} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showTaskForm && <AddTaskModal sceneName={scene.name} isChores={sceneId === 'chores'} onClose={() => setShowTaskForm(false)} onAdd={addTask} />}
      {notice && <div className="toast-note" role="status" data-testid="status-notice"><Check size={16} />{notice === 'demo' ? 'デモ家族を読み込みました' : notice === 'family-saved' ? '家族プロフィールを保存しました' : notice === 'task-added' ? 'やることをボードに足しました' : notice === 'dependency' ? '先に前の作業を終える順番です' : notice === 'dependents-reset' ? '後に続く作業も未完了に戻しました' : notice === 'rain' ? '移動を短くする順番に組み替えました' : notice === 'delay' ? '今すぐ必要なことを先にしました' : '家族の状態に合わせて予定を組み替えました'}</div>}
    </div>
  );
}

function ChoreLanes({ tasks, replanVersion, onToggle }: { tasks: Task[]; replanVersion: number; onToggle: (taskId: string) => void }) {
  let taskNumber = 0;
  let parallelLaneCount = 0;
  return <div className="chore-lanes" data-testid="parallel-lanes">{buildLanes(tasks).map((lane) => {
    const firstTaskIndex = taskNumber;
    taskNumber += lane.tasks.length;
    if (lane.label) parallelLaneCount += 1;
    const laneNumber = String(parallelLaneCount).padStart(2, '0');
    return lane.label ? <section className="parallel-lane" key={`${lane.id}-${replanVersion}`} data-testid={`parallel-lane-${lane.id}`} aria-label={`並行レーン${laneNumber}`}>
      <div className="lane-heading"><span><span className="lane-number">{laneNumber}</span>並行レーン</span><strong>約{lane.minutes}分</strong></div>
      <div className="lane-tasks">{lane.tasks.map((task, index) => <TaskRow key={`${task.id}-${replanVersion}`} task={task} index={firstTaskIndex + index} onToggle={() => onToggle(task.id)} />)}</div>
    </section> : <TaskRow key={`${lane.tasks[0].id}-${replanVersion}`} task={lane.tasks[0]} index={firstTaskIndex} showParallel={false} onToggle={() => onToggle(lane.tasks[0].id)} />;
  })}</div>;
}

function TaskRow({ task, index, onToggle, showParallel = Boolean(task.parallelGroup) }: { task: Task; index: number; onToggle: () => void; showParallel?: boolean }) {
  return <div className={`task-row ${task.status === 'done' ? 'completed' : ''}`} data-testid={`task-row-${task.id}`}><span className="task-index">{String(index + 1).padStart(2, '0')}</span><button type="button" className="task-check" onClick={onToggle} aria-label={`${task.title}を${task.status === 'done' ? '未完了に戻す' : '完了にする'}`} data-testid={`button-toggle-task-${task.id}`}>{task.status === 'done' && <Check size={15} strokeWidth={3} />}</button><div className="task-main"><strong>{task.title}</strong><div className="task-details"><span><Clock3 size={13} />{task.durationMinutes}分</span><span><UsersRound size={13} />{task.assignee}</span><span><MapPin size={13} />{task.location}</span>{showParallel && <small className="parallel-pill">同時進行</small>}{task.optional && <small>できたら</small>}{task.dependsOn?.length ? <small className="dependency-pill">前の作業のあと</small> : null}</div></div><span className={`task-tail ${task.canPause ? 'pause' : ''}`}>{task.canPause ? '途中で止めてもOK' : 'つづけて'}</span><button type="button" className="drag-dots" aria-label={`${task.title}を並べ替える`} data-testid={`button-reorder-task-${task.id}`}><MoreHorizontal size={18} /></button></div>;
}

function AddTaskModal({ sceneName, isChores, onClose, onAdd }: { sceneName: string; isChores: boolean; onClose: () => void; onAdd: (task: Omit<Task, 'id' | 'status'>) => void }) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [assignee, setAssignee] = useState('おとな');
  const [location, setLocation] = useState('自宅');
  const [parallelGroup, setParallelGroup] = useState('none');
  const [canPause, setCanPause] = useState(true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      durationMinutes: Math.max(1, Number(durationMinutes) || 1),
      assignee: assignee.trim() || 'おとな',
      location: location.trim() || '自宅',
      canPause,
      ...(parallelGroup !== 'none' ? { parallelGroup } : {}),
    });
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="modal-panel add-task-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-top"><div><div className="eyebrow coral-text">今日のボードに足す</div><h2>{sceneName}のやること</h2></div><IconButton label="閉じる" onClick={onClose}><X size={19} /></IconButton></div><p className="modal-lead">今の家族に合わせて、小さな作業から足せます。</p><label className="field-label">やること<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例：連絡帳を確認する" data-testid="input-new-task-title" /></label><div className="task-form-grid"><label className="field-label">所要時間（分）<input type="number" min="1" max="240" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} data-testid="input-new-task-duration" /></label><label className="field-label">担当<input value={assignee} onChange={(event) => setAssignee(event.target.value)} data-testid="input-new-task-assignee" /></label></div><div className="task-form-grid"><label className="field-label">場所<input value={location} onChange={(event) => setLocation(event.target.value)} data-testid="input-new-task-location" /></label>{isChores ? <label className="field-label">同時実行グループ<select value={parallelGroup} onChange={(event) => setParallelGroup(event.target.value)} data-testid="select-new-task-parallel"><option value="none">単独で進める</option><option value="housework-start">洗濯・料理と同時</option><option value="errands">外出前の家事と同時</option></select></label> : <span />}</div><label className="pause-option"><input type="checkbox" checked={canPause} onChange={(event) => setCanPause(event.target.checked)} data-testid="checkbox-new-task-pausable" /><span>途中で止めてもOK</span></label><div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose} data-testid="button-cancel-add-task">キャンセル</button><button type="submit" className="primary-button" disabled={!title.trim()} data-testid="button-save-task"><Plus size={16} />ボードに足す</button></div></form></div>;
}

function RoomPick({ onShowPolicy }: { onShowPolicy: () => void }) {
  return <section className="room-pick" aria-labelledby="room-pick-title" data-testid="card-rakuten-room">
    <div className="room-pick-top"><span className="pr-label">PR</span><span>楽天ROOM</span></div>
    <h3 id="room-pick-title">毎日の段取りを<br />助けてくれる道具</h3>
    <p>家事や外出の準備で役立っているものを、楽天ROOMにまとめています。</p>
    <a className="room-link" href={RAKUTEN_ROOM_URL} target="_blank" rel="noopener sponsored" data-testid="link-rakuten-room">楽天ROOMで見る<ExternalLink size={13} /></a>
    <button type="button" className="room-note" onClick={onShowPolicy}>紹介料を受け取るリンクです</button>
  </section>;
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal-panel privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onMouseDown={(event) => event.stopPropagation()} data-testid="modal-privacy">
    <div className="modal-top"><span className="modal-icon"><ShieldCheck size={22} /></span><IconButton label="閉じる" onClick={onClose}><X size={19} /></IconButton></div>
    <div className="eyebrow coral-text">安心して使うために</div>
    <h2 id="privacy-title">プライバシーと広告について</h2>
    <h3>家族の情報の保存先</h3>
    <p>家族プロフィールややることのデータは、お使いの端末のブラウザ（localStorage）にだけ保存されます。運営者のサーバーに送られることはありません。ブラウザのサイトデータを削除すると、保存した内容も消えます。</p>
    <h3>広告（アフィリエイト）</h3>
    <p>このアプリには、運営者の楽天ROOMへのリンクがあります。リンク先で商品が購入されると、運営者に紹介料が支払われることがあります。「PR」と表示している部分が広告です。</p>
    <h3>外部への情報の送信</h3>
    <p>文字をきれいに表示するため、Google Fonts（Google LLC）からフォントを読み込んでいます。このとき、お使いの端末のIPアドレスやブラウザの種類などがGoogleに送られます。家族の情報やタスクの内容は送られません。</p><p>アクセス解析や広告配信のためのプログラムは読み込んでいません。楽天ROOMのリンクを開くと楽天のサイトに移動し、そこから先は楽天グループのプライバシーポリシーが適用されます。</p>
    <h3>この内容の変更</h3>
    <p>機能の追加などに合わせて、この内容を変更することがあります。変更したときは、このページでお知らせします。</p>
    <div className="modal-actions"><button type="button" className="primary-button" onClick={onClose} data-testid="button-close-privacy">閉じる</button></div>
  </div></div>;
}

function SituationModal({ situation, onClose, onReplan }: { situation: Situation; onClose: () => void; onReplan: () => void }) {
  const Icon = situation.icon;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal-panel situation-modal" role="dialog" aria-modal="true" aria-labelledby="situation-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-top"><span className="modal-icon"><Icon size={22} /></span><IconButton label="閉じる" onClick={onClose}><X size={19} /></IconButton></div><div className="eyebrow coral-text">状況の変化</div><h2 id="situation-title">{situation.label}</h2><p>{situation.description}</p><div className="replan-preview"><div className="preview-label">組み替え後の考え方</div><div className="preview-line"><span className="preview-number">01</span><strong>今すぐ必要なことを先に</strong></div><div className="preview-line"><span className="preview-number">02</span><strong>待てることは、いったん横に</strong></div><div className="preview-line"><span className="preview-number">03</span><strong>家族の負担が少ない順番へ</strong></div></div><div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose} data-testid="button-cancel-replan">このままにする</button><button type="button" className="primary-button" onClick={onReplan} data-testid="button-confirm-replan"><RefreshCw size={16} />この状況で組み替える</button></div></div></div>;
}

function FamilyModal({ family, onClose, onSave }: { family: FamilySettings; onClose: () => void; onSave: (family: FamilySettings) => void }) {
  const [draft, setDraft] = useState(family);
  const [newChild, setNewChild] = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newTransport, setNewTransport] = useState('');
  const [activeTab, setActiveTab] = useState<'family' | 'places'>('family');

  const addChild = () => { if (!newChild.trim()) return; setDraft((current) => ({ ...current, children: [...current.children, { id: `child-${Date.now()}`, name: newChild.trim(), ageMonths: 24, capabilities: ['様子を見ながら'] }] })); setNewChild(''); };
  const removeChild = (id: string) => setDraft((current) => ({ ...current, children: current.children.filter((child) => child.id !== id) }));
  const updateChild = (id: string, field: 'name' | 'ageMonths', value: string) => setDraft((current) => ({ ...current, children: current.children.map((child) => child.id === id ? { ...child, [field]: field === 'ageMonths' ? Number(value) : value } : child) }));
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(draft); };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><form className="modal-panel family-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-top"><div><div className="eyebrow coral-text">わが家を整える</div><h2>家族プロフィール</h2></div><IconButton label="閉じる" onClick={onClose}><X size={19} /></IconButton></div><p className="modal-lead">ここで入力したことは、あなたの端末にだけ保存されます。</p><label className="field-label">家の呼び名<input value={draft.homeName} onChange={(event) => setDraft({ ...draft, homeName: event.target.value })} data-testid="input-home-name" /></label><div className="form-tabs"><button type="button" className={activeTab === 'family' ? 'active' : ''} onClick={() => setActiveTab('family')} data-testid="tab-family">家族</button><button type="button" className={activeTab === 'places' ? 'active' : ''} onClick={() => setActiveTab('places')} data-testid="tab-places">場所と移動</button></div>{activeTab === 'family' ? <div className="form-section"><div className="section-heading"><strong>子ども</strong><span>年齢とできることを目安にします</span></div>{draft.children.map((child) => <div className="child-edit" key={child.id}><span className="child-avatar child-edit-avatar">{child.name.slice(0, 1)}</span><div className="child-edit-fields"><input value={child.name} onChange={(event) => updateChild(child.id, 'name', event.target.value)} aria-label={`${child.name}の名前`} data-testid={`input-child-name-${child.id}`} /><div className="age-input"><input type="number" min="0" max="240" value={child.ageMonths} onChange={(event) => updateChild(child.id, 'ageMonths', event.target.value)} aria-label={`${child.name}の月齢`} data-testid={`input-child-age-${child.id}`} /><span>か月</span></div></div><IconButton label={`${child.name}を削除`} onClick={() => removeChild(child.id)}><Trash2 size={15} /></IconButton></div>)}<div className="add-line"><input placeholder="子どもの名前を追加" value={newChild} onChange={(event) => setNewChild(event.target.value)} data-testid="input-new-child" /><button type="button" className="soft-button" onClick={addChild} data-testid="button-add-child"><Plus size={15} />追加</button></div></div> : <div className="form-section"><div className="section-heading"><strong>よく使う場所</strong><span>予定の行き先に使われます</span></div>{draft.places.map((place) => <div className="setting-line" key={place.id}><span className="setting-icon"><MapPin size={15} /></span><span>{place.name}</span><IconButton label={`${place.name}を削除`} onClick={() => setDraft((current) => ({ ...current, places: current.places.filter((item) => item.id !== place.id) }))}><Trash2 size={15} /></IconButton></div>)}<div className="add-line"><input placeholder="場所を追加" value={newPlace} onChange={(event) => setNewPlace(event.target.value)} data-testid="input-new-place" /><button type="button" className="soft-button" onClick={() => { if (newPlace.trim()) { setDraft((current) => ({ ...current, places: [...current.places, { id: `place-${Date.now()}`, name: newPlace.trim(), type: 'other' }] })); setNewPlace(''); } }} data-testid="button-add-place"><Plus size={15} />追加</button></div><div className="section-heading transport-heading"><strong>移動手段</strong><span>使うものだけ残します</span></div>{draft.transportOptions.map((item) => <div className="setting-line" key={item.id}><span className="setting-icon"><BusFront size={15} /></span><span>{item.name}</span><IconButton label={`${item.name}を削除`} onClick={() => setDraft((current) => ({ ...current, transportOptions: current.transportOptions.filter((option) => option.id !== item.id) }))}><Trash2 size={15} /></IconButton></div>)}<div className="add-line"><input placeholder="移動手段を追加" value={newTransport} onChange={(event) => setNewTransport(event.target.value)} data-testid="input-new-transport" /><button type="button" className="soft-button" onClick={() => { if (newTransport.trim()) { setDraft((current) => ({ ...current, transportOptions: [...current.transportOptions, { id: `transport-${Date.now()}`, name: newTransport.trim(), iconKey: 'other' }] })); setNewTransport(''); } }} data-testid="button-add-transport"><Plus size={15} />追加</button></div></div>}<div className="modal-actions"><button type="button" className="ghost-button" onClick={onClose} data-testid="button-cancel-family">キャンセル</button><button type="submit" className="primary-button" data-testid="button-save-family"><Check size={16} />保存する</button></div></form></div>;
}

function Router() {
  return <ErrorBoundary resetKey={window.location.pathname}><App /></ErrorBoundary>;
}

export default function RootApp() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}