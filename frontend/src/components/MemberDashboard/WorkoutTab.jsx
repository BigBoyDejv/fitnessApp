import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../../utils/api';
import {
   Chart as ChartJS,
   CategoryScale, LinearScale,
   PointElement, LineElement,
   Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
const FEELING_EMOJIS = ['', '😴', '😐', '💪', '🔥', '⚡'];
const FEELING_LABELS = ['', 'Slabý', 'Priemerný', 'Dobrý', 'Výborný', 'Epický'];
const FEELING_COLORS = ['', '#666', '#FF9500', '#C8FF00', '#00FFD1', '#BF5AF2'];
const QUICK_EXERCISES = ['Bench press', 'Zakopy', 'Predkopy', 'Lat Pulldown', 'Drepy na smithe', 'Peck Flies', 'Single Arm pulldown'];

// Helper: get headers based on track type
const getTrackHeaders = (trackType, customLabels = null) => {
   if (trackType === 'custom' && customLabels) {
      const labels = JSON.parse(customLabels);
      return [labels[0] || 'Hodnota 1', labels[1] || 'Hodnota 2'];
   }
   const map = {
      weight_reps: ['VÁHA (kg)', 'REPS'],
      time_only: ['ČAS (min)', '—'],
      time_distance: ['ČAS (min)', 'KM'],
      reps_only: ['—', 'REPS'],
      custom: ['Hodnota 1', 'Hodnota 2'],
   };
   return map[trackType] || ['VÁHA (kg)', 'REPS'];
};

const getTrackTypeLabel = (trackType) => {
   const map = {
      weight_reps: 'váha + reps',
      time_only: 'len čas',
      time_distance: 'čas + km',
      reps_only: 'opakovania',
      custom: 'vlastné'
   };
   return map[trackType] || trackType;
};

function WorkoutTab({ user }) {
   // Calendar & selection
   const [calYear, setCalYear] = useState(new Date().getFullYear());
   const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
   const [calWorkoutDates, setCalWorkoutDates] = useState([]);
   const [selectedDate, setSelectedDate] = useState(null);
   const [currentWorkout, setCurrentWorkout] = useState(null);

   // Editor state
   const [isEditing, setIsEditing] = useState(false);
   const [editorTitle, setEditorTitle] = useState('');
   const [editorNotes, setEditorNotes] = useState('');
   const [editorFeeling, setEditorFeeling] = useState(3);
   const [editorExercises, setEditorExercises] = useState([]);
   const [editingWorkoutId, setEditingWorkoutId] = useState(null);

   // Presets
   const [presets, setPresets] = useState([]);
   const [currentPreset, setCurrentPreset] = useState(null);
   const [showPresetDetail, setShowPresetDetail] = useState(false);
   const [showNewPresetForm, setShowNewPresetForm] = useState(false);

   // Weekly stats
   const [weeklyStats, setWeeklyStats] = useState({ thisWeekWorkouts: 0, lastWeekWorkouts: 0, thisWeekVolume: 0, lastWeekVolume: 0, workoutDiff: 0, volumeDiff: 0 });

   // Track Type Modal
   const [trackTypeModal, setTrackTypeModal] = useState({ show: false, exerciseIdx: -1, type: 'weight_reps', category: 'sila', customLabels: ['', ''] });

   // Progress chart
   const [progressExercise, setProgressExercise] = useState('');
   const [progressData, setProgressData] = useState([]);
   const [exerciseTemplates, setExerciseTemplates] = useState([]);
   const progressChartRef = useRef(null);

   // Load data on mount
   useEffect(() => {
      loadCalendarData();
      loadPresets();
      loadWeeklyStats();
      loadExerciseTemplates();
   }, []);

   useEffect(() => {
      loadCalendarData();
   }, [calYear, calMonth]);

   useEffect(() => {
      if (selectedDate) loadWorkoutForDate(selectedDate);
   }, [selectedDate]);

   // ---- API & Local cache ----
   const saveWorkoutLocal = (dateStr, data) => {
      localStorage.setItem(`workout_${user.id}_${dateStr}`, JSON.stringify(data));
   };
   const getWorkoutLocal = (dateStr) => {
      const raw = localStorage.getItem(`workout_${user.id}_${dateStr}`);
      return raw ? JSON.parse(raw) : null;
   };
   const saveCalendarLocal = (year, month, dates) => {
      localStorage.setItem(`cal_${user.id}_${year}_${month}`, JSON.stringify(dates));
   };
   const getCalendarLocal = (year, month) => {
      const raw = localStorage.getItem(`cal_${user.id}_${year}_${month}`);
      return raw ? JSON.parse(raw) : null;
   };

   const loadCalendarData = async () => {
      const cached = getCalendarLocal(calYear, calMonth);
      if (cached) setCalWorkoutDates(cached);
      try {
         const res = await authenticatedFetch(`/api/workouts/calendar?year=${calYear}&month=${calMonth}`);
         if (res.ok) {
            const dates = await res.json();
            setCalWorkoutDates(dates);
            saveCalendarLocal(calYear, calMonth, dates);
         }
      } catch (e) { console.error(e); }
   };

   const loadWorkoutForDate = async (dateStr) => {
      const local = getWorkoutLocal(dateStr);
      if (local) {
         setCurrentWorkout(local);
         return;
      }
      try {
         const res = await authenticatedFetch(`/api/workouts/day?date=${dateStr}`);
         if (res.ok) {
            const workout = await res.json();
            setCurrentWorkout(workout);
            saveWorkoutLocal(dateStr, workout);
         } else {
            setCurrentWorkout(null);
         }
      } catch { setCurrentWorkout(null); }
   };

   const loadPresets = async () => {
      try {
         const res = await authenticatedFetch('/api/workout-presets');
         if (res.ok) {
            const data = await res.json();
            setPresets(data);
         }
      } catch (e) { console.error(e); }
   };

   const loadWeeklyStats = async () => {
      try {
         const res = await authenticatedFetch('/api/workouts/weekly-stats');
         if (res.ok) setWeeklyStats(await res.json());
      } catch (e) { console.error(e); }
   };

   const loadExerciseTemplates = async (query = '') => {
      try {
         const url = query ? `/api/exercise-templates?q=${encodeURIComponent(query)}` : '/api/exercise-templates';
         const res = await authenticatedFetch(url);
         if (res.ok) {
            const data = await res.json();
            if (!query) setExerciseTemplates(data);
            return data;
         }
      } catch { }
      return [];
   };

   // ---- Calendar helpers ----
   const calPrev = () => {
      if (calMonth === 1) {
         setCalMonth(12);
         setCalYear(y => y - 1);
      } else {
         setCalMonth(m => m - 1);
      }
   };
   const calNext = () => {
      if (calMonth === 12) {
         setCalMonth(1);
         setCalYear(y => y + 1);
      } else {
         setCalMonth(m => m + 1);
      }
   };

   const renderCalendar = () => {
      const firstDay = new Date(calYear, calMonth - 1, 1);
      const lastDay = new Date(calYear, calMonth, 0);
      let startDow = (firstDay.getDay() + 6) % 7; // 0 = Monday
      const daysInMonth = lastDay.getDate();
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      let cells = [];
      for (let i = 0; i < startDow; i++) {
         cells.push(<div key={`empty-${i}`} className="cal-day other-month" />);
      }
      for (let d = 1; d <= daysInMonth; d++) {
         const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const hasWorkout = calWorkoutDates.includes(dateStr);
         const isSelected = selectedDate === dateStr;
         const isToday = todayStr === dateStr;
         cells.push(
            <div
               key={d}
               className={`cal-day ${hasWorkout ? 'has-workout' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
               onClick={() => setSelectedDate(dateStr)}
            >
               {d}
            </div>
         );
      }
      return cells;
   };

   // ---- Workout detail view ----
   const handleDeleteWorkout = async () => {
      if (!currentWorkout?.id) return;
      if (!window.confirm('Naozaj odstrániť tento tréning?')) return;
      try {
         await authenticatedFetch(`/api/workouts/${currentWorkout.id}`, { method: 'DELETE' });
         localStorage.removeItem(`workout_${user.id}_${selectedDate}`);
         saveCalendarLocal(calYear, calMonth, null);
         setCurrentWorkout(null);
         loadCalendarData();
      } catch (e) { console.error(e); }
   };

   // ---- Editor logic ----
   const openEditor = (workout = null) => {
      if (workout) {
         setEditorTitle(workout.title || '');
         setEditorNotes(workout.notes || '');
         setEditorFeeling(workout.feeling || 3);
         setEditorExercises(workout.exercises || []);
         setEditingWorkoutId(workout.id);
      } else {
         setEditorTitle('');
         setEditorNotes('');
         setEditorFeeling(3);
         setEditorExercises([emptyExercise()]);
         setEditingWorkoutId(null);
      }
      setIsEditing(true);
   };

   const closeEditor = () => {
      setIsEditing(false);
      if (selectedDate) loadWorkoutForDate(selectedDate);
      loadWeeklyStats();
   };

   const emptyExercise = () => ({
      id: `new_${Date.now()}`,
      name: '',
      category: 'sila',
      trackType: 'weight_reps',
      customLabels: null,
      sets: [{ setNumber: 1, weight: 0, reps: 0, duration: null }]
   });

   const addExercise = () => {
      setEditorExercises([...editorExercises, emptyExercise()]);
   };

   const updateExercise = (idx, field, value) => {
      const updated = [...editorExercises];
      updated[idx] = { ...updated[idx], [field]: value };
      setEditorExercises(updated);
   };

   const removeExercise = (idx) => {
      setEditorExercises(editorExercises.filter((_, i) => i !== idx));
   };

   const addSet = (exIdx) => {
      const updated = [...editorExercises];
      const ex = updated[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet = lastSet ? { ...lastSet, setNumber: ex.sets.length + 1 } : { setNumber: 1, weight: 0, reps: 0 };
      ex.sets.push(newSet);
      setEditorExercises(updated);
   };

   const removeSet = (exIdx, setIdx) => {
      const updated = [...editorExercises];
      updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx);
      updated[exIdx].sets.forEach((s, i) => s.setNumber = i + 1);
      setEditorExercises(updated);
   };

   const updateSet = (exIdx, setIdx, field, value) => {
      const updated = [...editorExercises];
      updated[exIdx].sets[setIdx][field] = value;
      setEditorExercises(updated);
   };

   const toggleSetPr = (exIdx, setIdx) => {
      const updated = [...editorExercises];
      updated[exIdx].sets[setIdx].isPr = !updated[exIdx].sets[setIdx].isPr;
      setEditorExercises(updated);
   };

   const saveWorkout = async () => {
      if (!selectedDate) return;
      const exercisesToSend = editorExercises.filter(ex => ex.name.trim() !== '');
      if (exercisesToSend.length === 0) {
         alert('Pridaj aspoň jeden cvik');
         return;
      }
      const payload = {
         date: selectedDate,
         title: editorTitle.trim() || 'Tréning',
         notes: editorNotes,
         feeling: editorFeeling,
         exercises: exercisesToSend.map(ex => ({
            name: ex.name,
            category: ex.category,
            trackType: ex.trackType,
            customLabels: ex.customLabels,
            sets: ex.sets.map(s => ({
               setNumber: s.setNumber,
               weight: s.weight,
               reps: s.reps,
               duration: s.duration,
               isPr: s.isPr || false
            }))
         }))
      };
      try {
         const url = editingWorkoutId ? `/api/workouts/${editingWorkoutId}` : '/api/workouts';
         const method = editingWorkoutId ? 'PUT' : 'POST';
         const res = await authenticatedFetch(url, { method, body: JSON.stringify(payload) });
         if (res.ok) {
            const saved = await res.json();
            saveWorkoutLocal(selectedDate, saved);
            saveCalendarLocal(calYear, calMonth, null);
            closeEditor();
            loadCalendarData();
            loadWeeklyStats();
         } else {
            const err = await res.text();
            alert('Chyba: ' + err);
         }
      } catch (e) { console.error(e); alert('Chyba pri ukladaní'); }
   };

   // ---- Preset management ----
   const createPreset = async (name) => {
      try {
         const res = await authenticatedFetch('/api/workout-presets', {
            method: 'POST',
            body: JSON.stringify({ name, exercises: [] })
         });
         if (res.ok) {
            const newPreset = await res.json();
            setPresets([...presets, newPreset]);
            setCurrentPreset(newPreset);
            setShowPresetDetail(true);
            setShowNewPresetForm(false);
         }
      } catch (e) { console.error(e); }
   };

   const openPresetDetail = async (presetId) => {
      try {
         const res = await authenticatedFetch(`/api/workout-presets/${presetId}`);
         if (res.ok) {
            const preset = await res.json();
            setCurrentPreset(preset);
            setShowPresetDetail(true);
         }
      } catch (e) { console.error(e); }
   };

   const updatePreset = async (updates) => {
      if (!currentPreset) return;
      try {
         const res = await authenticatedFetch(`/api/workout-presets/${currentPreset.id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
         });
         if (res.ok) {
            const updated = await res.json();
            setCurrentPreset(updated);
            loadPresets();
         }
      } catch (e) { console.error(e); }
   };

   const deletePreset = async () => {
      if (!currentPreset || !window.confirm(`Zmazať plán "${currentPreset.name}"?`)) return;
      try {
         await authenticatedFetch(`/api/workout-presets/${currentPreset.id}`, { method: 'DELETE' });
         setShowPresetDetail(false);
         setCurrentPreset(null);
         loadPresets();
      } catch (e) { console.error(e); }
   };

   const startWorkoutFromPreset = () => {
      if (!currentPreset) return;
      const exercises = currentPreset.exercises.map(ex => ({
         ...ex,
         id: `preset_${Date.now()}_${Math.random()}`,
         sets: ex.sets.map(s => ({ ...s, isPr: false }))
      }));
      setEditorExercises(exercises);
      setEditorTitle(currentPreset.name);
      setEditorNotes('');
      setEditorFeeling(3);
      setEditingWorkoutId(null);
      setIsEditing(true);
      setShowPresetDetail(false);
   };

   // ---- Progress chart ----
   const loadProgress = async (exerciseName = null) => {
      const targetExercise = exerciseName || progressExercise;
      if (!targetExercise.trim()) return;
      try {
         const res = await authenticatedFetch(`/api/workouts/progress?exercise=${encodeURIComponent(targetExercise)}`);
         if (res.ok) {
            const data = await res.json();
            setProgressData(data);
         } else {
            setProgressData([]);
         }
      } catch (e) {
         setProgressData([]);
      }
   };

   // ---- Render helpers for editor ----
   const renderSetInputs = (ex, exIdx, set, setIdx, headers) => {
      const trackType = ex.trackType;
      switch (trackType) {
         case 'time_only':
            return (
               <>
                  <input className="set-input" type="number" min="0" step="1" placeholder="min"
                     value={set.duration ? Math.round(set.duration / 60) : ''}
                     onChange={e => updateSet(exIdx, setIdx, 'duration', e.target.value ? parseInt(e.target.value) * 60 : null)} />
                  <div className="set-input" style={{ background: 'transparent', borderColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>—</div>
               </>
            );
         case 'time_distance':
            return (
               <>
                  <input className="set-input" type="number" min="0" step="1" placeholder="min"
                     value={set.duration ? Math.round(set.duration / 60) : ''}
                     onChange={e => updateSet(exIdx, setIdx, 'duration', e.target.value ? parseInt(e.target.value) * 60 : null)} />
                  <input className="set-input" type="number" min="0" step="0.1" placeholder="km"
                     value={set.reps ? set.reps / 10 : ''}
                     onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseFloat(e.target.value) * 10 : null)} />
               </>
            );
         case 'reps_only':
            return (
               <>
                  <div className="set-input" style={{ background: 'transparent', borderColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)' }}>#{set.setNumber}</div>
                  <input className="set-input" type="number" min="0" step="1" placeholder="reps"
                     value={set.reps || ''}
                     onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)} />
               </>
            );
         case 'custom': {
            const labels = ex.customLabels ? JSON.parse(ex.customLabels) : ['', ''];
            return (
               <>
                  <input className="set-input" type="number" min="0" step="0.5" placeholder={labels[0]}
                     value={set.weight || ''}
                     onChange={e => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)} />
                  <input className="set-input" type="number" min="0" step="1" placeholder={labels[1]}
                     value={set.reps || ''}
                     onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)} />
               </>
            );
         }
         default: // weight_reps
            return (
               <>
                  <input className="set-input" type="number" min="0" step="0.5" placeholder="kg"
                     value={set.weight || ''}
                     onChange={e => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)} />
                  <input className="set-input" type="number" min="0" step="1" placeholder="reps"
                     value={set.reps || ''}
                     onChange={e => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)} />
               </>
            );
      }
   };

   // ---- Main render ----
   return (
      <div className="ps active" id="pg-workout">
         {/* Workout Editor Modal (inline) - Renders at TOP when active */}
         {isEditing ? (
            <div className="panel workout-editor-modern animate-in" style={{ marginBottom: '2rem' }}>
               <div className="ph" style={{ padding: '0.8rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                     <i className="fas fa-edit" style={{ color: 'var(--acid)', opacity: 0.6 }} />
                     <span className="pt" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>{editingWorkoutId ? 'UPRAVIŤ TRÉNING' : 'NOVÝ ZÁPIS'}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm icn-only" onClick={closeEditor}><i className="fas fa-times" /></button>
               </div>

               <div style={{ padding: '1.5rem' }}>
                  {/* Editor Header Info */}
                  <div className="wd-editor-top" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', marginBottom: '1.5rem' }}>
                     <div>
                        <label className="fl">Názov tréningu</label>
                        <input
                           className="fi"
                           value={editorTitle}
                           onChange={e => setEditorTitle(e.target.value)}
                           placeholder="napr. Push Day, Leg Day A"
                           style={{ fontSize: '1rem', fontWeight: '800' }}
                        />
                     </div>
                     <div>
                        <label className="fl">Intenzita / Pocit</label>
                        <div className="wd-feeling-row" style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.3rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                           {[1, 2, 3, 4, 5].map(v => (
                              <button
                                 key={v}
                                 className={`wd-feel-btn ${editorFeeling === v ? 'active' : ''}`}
                                 onClick={() => setEditorFeeling(v)}
                                 title={FEELING_LABELS[v]}
                                 style={{
                                    width: '38px', height: '38px', borderRadius: '6px', fontSize: '1.2rem',
                                    background: editorFeeling === v ? 'var(--acid)' : 'transparent',
                                    border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                 }}
                              >
                                 {FEELING_EMOJIS[v]}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                     <label className="fl">Poznámky k tréningu</label>
                     <textarea
                        className="fi"
                        rows="2"
                        value={editorNotes}
                        onChange={e => setEditorNotes(e.target.value)}
                        placeholder="Dnes to išlo skvelo, zameral som sa na techniku..."
                        style={{ fontSize: '0.85rem' }}
                     />
                  </div>

                  {/* Exercises List in Editor */}
                  <div className="ex-editor-list" style={{ marginBottom: '2rem' }}>
                     <div className="lh" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '3px solid var(--acid)' }}>CVIKY V TRÉNINGU</div>

                     {editorExercises.map((ex, exIdx) => {
                        const headers = getTrackHeaders(ex.trackType, ex.customLabels);
                        return (
                           <div key={ex.id} className="ex-editor-card" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '1.2rem', marginBottom: '1rem' }}>
                              <div className="ex-header" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem', alignItems: 'center' }}>
                                 <div style={{ flex: 1 }}>
                                    <input
                                       list="ex-names-list"
                                       className="ex-name-input"
                                       value={ex.name}
                                       onChange={e => updateExercise(exIdx, 'name', e.target.value)}
                                       placeholder="NÁZOV CVIKU..."
                                       style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '100%', color: '#fff', fontSize: '1rem', fontWeight: '900', padding: '0.4rem 0' }}
                                    />
                                 </div>
                                 <select
                                    className="fi"
                                    value={ex.category}
                                    onChange={e => updateExercise(exIdx, 'category', e.target.value)}
                                    style={{ maxWidth: '100px', cursor: 'pointer', fontSize: '0.75rem' }}
                                 >
                                    <option value="sila">💪 SILA</option>
                                    <option value="kardio">🏃 KARDIO</option>
                                 </select>
                                 <button
                                    className="btn btn-ghost btn-xs icn-only"
                                    onClick={() => {
                                       setTrackTypeModal({
                                          show: true,
                                          exerciseIdx: exIdx,
                                          type: ex.trackType || 'weight_reps',
                                          category: ex.category || 'sila',
                                          customLabels: ex.customLabels ? JSON.parse(ex.customLabels) : ['', '']
                                       });
                                    }}
                                    title="Zmeniť typ merania"
                                 >
                                    <i className="fas fa-sliders-h" />
                                 </button>
                                 <button className="btn btn-ghost btn-xs icn-only" style={{ color: 'var(--red)' }} onClick={() => removeExercise(exIdx)}><i className="fas fa-trash" /></button>
                              </div>

                              <div className="set-list">
                                 <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 40px 40px', gap: '1rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: '800' }}>#</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: '800' }}>{headers[0]}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: '800' }}>{headers[1]}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: '800', textAlign: 'center' }}>PR</div>
                                    <div />
                                 </div>

                                 {ex.sets.map((set, setIdx) => (
                                    <div key={setIdx} className="set-row" style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 40px 40px', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.015)', padding: '0.4rem', borderRadius: '6px' }}>
                                       <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--muted)', textAlign: 'center' }}>{set.setNumber}</div>
                                       {renderSetInputs(ex, exIdx, set, setIdx, headers)}
                                       <button
                                          className={`icn-only ${set.isPr ? 'active' : ''}`}
                                          onClick={() => toggleSetPr(exIdx, setIdx)}
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', opacity: set.isPr ? 1 : 0.2, transition: 'all 0.2s' }}
                                       >
                                          🏆
                                       </button>
                                       <button
                                          className="btn btn-ghost icn-only"
                                          style={{ border: 'none', color: 'var(--red)', opacity: 0.3 }}
                                          onClick={() => removeSet(exIdx, setIdx)}
                                          disabled={ex.sets.length <= 1}
                                       >
                                          <i className="fas fa-times" />
                                       </button>
                                    </div>
                                 ))}
                                 <button className="btn-add-set" onClick={() => addSet(exIdx)} style={{ marginTop: '0.8rem' }}><i className="fas fa-plus-circle" /> PRIDAŤ SÉRIU</button>
                              </div>
                           </div>
                        );
                     })}
                     <button className="btn btn-ghost btn-block" onClick={addExercise} style={{ borderStyle: 'dashed', marginTop: '1rem', fontWeight: '800', letterSpacing: '0.05em' }}><i className="fas fa-plus" /> PRIDAŤ ĎALŠÍ CVIK</button>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <button className="btn btn-acid btn-block" onClick={saveWorkout} style={{ fontSize: '1rem' }}><i className="fas fa-save" /> ULOŽIŤ TRÉNING</button>
                     <button className="btn btn-ghost btn-block" onClick={closeEditor}>ZRUŠIŤ</button>
                  </div>
               </div>

               <datalist id="ex-names-list">
                  {exerciseTemplates.map(ex => <option key={ex.id || ex.name} value={ex.name} />)}
               </datalist>
            </div>
         ) : (
            <div className="workout-container-legacy animate-in">
               {/* 1. TOP SECTION: Calendar + Day Detail */}
               <div className="wd-top-grid">
                  {/* Left Column: Calendar Panel */}
                  <div className="panel calendar-panel-legacy">
                     <div className="ph" style={{ justifyContent: 'space-between', padding: '0.8rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                           <i className="fas fa-calendar-alt" style={{ color: 'var(--acid)', opacity: 0.6 }} />
                           <span className="pt" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>KALENDÁR</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <button className="btn btn-ghost btn-xs icn-only" onClick={calPrev}><i className="fas fa-chevron-left" /></button>
                           <button className="btn btn-ghost btn-xs icn-only" onClick={calNext}><i className="fas fa-chevron-right" /></button>
                        </div>
                     </div>

                     <div className="cal-header-bar" style={{ textAlign: 'center', padding: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', fontFamily: 'var(--font-d)', color: 'var(--text)' }}>{MONTHS[calMonth - 1]} {calYear}</span>
                     </div>

                     <div style={{ padding: '1rem' }}>
                        <div id="calGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                           {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(dHead => <div key={dHead} style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--muted)', marginBottom: '0.4rem' }}>{dHead}</div>)}
                           {renderCalendar()}
                        </div>
                     </div>
                     <div className="cal-legend" style={{ padding: '0.8rem 1rem', display: 'flex', gap: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.03)', justifyContent: 'center' }}>
                        <span className="lg-it"><span className="lg-dot workout" /> TRÉNING</span>
                        <span className="lg-it"><span className="lg-dot today" /> DNES</span>
                     </div>
                  </div>

                  {/* Right Column: Day Detail Panel */}
                  <div className="panel day-detail-legacy" style={{ background: 'var(--surface)' }}>
                     <div className="ph" style={{ padding: '0.8rem 1.25rem' }}>
                        <div className="date-badge">
                           <span className="pt" id="workoutDayTitle" style={{ fontSize: '0.85rem' }}>
                              {selectedDate ? new Date(selectedDate).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Vyber deň'}
                           </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                           {currentWorkout ? (
                              <>
                                 <button className="btn btn-ghost btn-xs icn-only" onClick={() => openEditor(currentWorkout)}><i className="fas fa-edit" /></button>
                                 <button className="btn btn-ghost btn-xs icn-only" style={{ color: 'var(--red)' }} onClick={handleDeleteWorkout}><i className="fas fa-trash" /></button>
                              </>
                           ) : (
                              selectedDate && <button className="btn btn-acid btn-xs" onClick={() => openEditor()}><i className="fas fa-plus" /> ZÁPIS</button>
                           )}
                        </div>
                     </div>

                     <div className="pb" style={{ padding: '0', minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
                        {!currentWorkout ? (
                           <div className="wd-empty-day">
                              <div className="empty-icon-wrap" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                 <i className="fas fa-calendar-day" style={{ fontSize: '1.5rem', opacity: 0.15 }} />
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: '600' }}>{selectedDate ? 'Žiadny tréning na tento deň' : 'Klikni na deň v kalendári'}</div>
                              {selectedDate && <button className="btn btn-acid btn-sm" style={{ marginTop: '1rem' }} onClick={() => openEditor()}>Pridať tréning</button>}
                           </div>
                        ) : (
                           <div className="workout-summary-view animate-in">
                              <div style={{ padding: '1.5rem', background: 'rgba(200,255,0,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{
                                       width: '64px', height: '64px', borderRadius: '50%',
                                       background: 'var(--surface2)',
                                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                                       fontSize: '2.2rem', boxShadow: '0 0 30px rgba(0,0,0,0.3)',
                                       border: `2px solid ${FEELING_COLORS[currentWorkout.feeling] || 'var(--border)'}`,
                                       position: 'relative'
                                    }}>
                                       {FEELING_EMOJIS[currentWorkout.feeling]}
                                       <div style={{ position: 'absolute', bottom: '-5px', fontSize: '0.55rem', fontWeight: '900', background: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>{FEELING_LABELS[currentWorkout.feeling]?.toUpperCase()}</div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                       <div style={{ fontWeight: '900', fontSize: '1.2rem', color: 'var(--text)', fontFamily: 'var(--font-d)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>{currentWorkout.title || 'Môj tréning'}</div>
                                       {currentWorkout.notes && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', marginTop: '0.4rem', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '0.6rem' }}>"{currentWorkout.notes}"</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                       <div style={{ fontFamily: 'var(--font-d)', fontSize: '1.8rem', fontWeight: '900', color: 'var(--acid)', lineHeight: 1 }}>{currentWorkout.totalVolume || 0}</div>
                                       <div style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--muted)', letterSpacing: '0.05em', marginTop: '4px' }}>CELKOVÝ OBJEM (KG)</div>
                                    </div>
                                 </div>
                              </div>
                              <div className="mini-exercise-list" style={{ padding: '1rem', flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                                 {currentWorkout.exercises?.map((ex, i) => (
                                    <div key={i} className="mini-ex-row" style={{ padding: '1rem', marginBottom: '0.8rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                       <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                                             <span className="ex-n" style={{ fontSize: '0.9rem' }}>{ex.name}</span>
                                             {ex.sets?.some(s => s.isPr) && <span className="badge b-acid" style={{ fontSize: '0.55rem' }}>🏆 PR</span>}
                                          </div>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                             {ex.sets?.map((s, si) => (
                                                <div
                                                   key={si}
                                                   className="set-pill"
                                                   style={{
                                                      fontSize: '0.65rem', fontWeight: '800',
                                                      background: s.isPr ? 'rgba(200,255,0,0.1)' : 'rgba(255,255,255,0.03)',
                                                      color: s.isPr ? 'var(--acid)' : 'var(--muted)',
                                                      padding: '2px 8px', borderRadius: '4px',
                                                      border: s.isPr ? '1px solid var(--acid)' : '1px solid rgba(255,255,255,0.05)'
                                                   }}
                                                >
                                                   {s.duration ? `${Math.round(s.duration / 60)}m` : ''}
                                                   {s.weight ? `${s.weight}kg` : ''}
                                                   {s.reps ? `×${s.reps}` : ''}
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                       <div style={{ textAlign: 'right', minWidth: '70px' }}>
                                          <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text)', fontFamily: 'var(--font-d)' }}>{ex.totalVolume || 0}</div>
                                          <div style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--muted)' }}>KG OBJEM</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* 2. PRESETS SECTION */}
               <div className="panel presets-panel-legacy animate-in" style={{ animationDelay: '0.1s' }}>
                  <div className="ph" style={{ padding: '0.8rem 1.25rem' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <i className="fas fa-bookmark" style={{ color: 'var(--acid)', opacity: 0.6 }} />
                        <span className="pt" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>TRÉNINGOVÉ PLÁNY</span>
                     </div>
                     <button className="btn btn-acid btn-xs" onClick={() => setShowNewPresetForm(!showNewPresetForm)}><i className="fas fa-plus" /> NOVÝ PLÁN</button>
                  </div>

                  {showNewPresetForm && (
                     <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'rgba(200,255,0,0.015)' }}>
                        <label className="fl">Názov nového plánu</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <input className="fi" id="newPresetName" placeholder='napr. "Horná časť tela A"' onKeyDown={e => e.key === 'Enter' && createPreset(e.target.value)} />
                           <button className="btn btn-acid btn-sm" onClick={() => createPreset(document.getElementById('newPresetName').value)}>VYTVORIŤ</button>
                           <button className="btn btn-ghost btn-sm" onClick={() => setShowNewPresetForm(false)}>ZRUŠIŤ</button>
                        </div>
                     </div>
                  )}

                  <div className="pb" style={{ padding: '0' }}>
                     <div className="preset-scroll-legacy">
                        {presets.map((p, i) => (
                           <div key={p.id} className="preset-card-legacy" onClick={() => openPresetDetail(p.id)}>
                              <div className="p-icon-wrap"><i className="fas fa-magic" /></div>
                              <div className="p-info-wrap">
                                 <div className="p-name">{p.name}</div>
                                 <div className="p-meta">{p.exerciseCount || p.exercises?.length || 0} cvikov · {p.useCount || 0}×</div>
                              </div>
                              <button
                                 className="p-play-btn icn-only"
                                 onClick={(e) => { e.stopPropagation(); setCurrentPreset(p); startWorkoutFromPreset(); }}
                                 title="Rýchly štart"
                              >
                                 <i className="fas fa-play" />
                              </button>
                           </div>
                        ))}
                        {presets.length === 0 && (
                           <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--muted)', fontSize: '0.8rem' }}>Zatiaľ nemáte žiadne plány</div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Preset Detail Modal (Inline) - Only shows when detail is active */}
               {showPresetDetail && currentPreset && (
                  <div className="panel animate-in" style={{ background: 'var(--surface2)', border: '1px solid var(--acid)', marginBottom: '1rem' }}>
                     <div className="ph" style={{ padding: '0.7rem 1.25rem' }}>
                        <div style={{ flex: 1 }}>
                           <input
                              className="wd-preset-title-input"
                              value={currentPreset.name}
                              onChange={e => updatePreset({ name: e.target.value })}
                              style={{ background: 'none', border: 'none', color: 'var(--acid)', fontWeight: '900', fontSize: '1rem', width: '100%', textTransform: 'uppercase' }}
                           />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <button className="btn btn-acid btn-sm" onClick={startWorkoutFromPreset}><i className="fas fa-play" /> ŠTART</button>
                           <button className="btn btn-ghost btn-sm" onClick={() => setShowPresetDetail(false)}><i className="fas fa-times" /></button>
                        </div>
                     </div>
                     <div className="pb" style={{ padding: '1rem' }}>
                        <div className="preset-exercises-detail" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                           {currentPreset.exercises?.map((ex, idx) => (
                              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                 <div style={{ fontSize: '0.85rem', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{ex.name}</span>
                                    <button className="btn btn-ghost btn-xs icn-only" onClick={() => { const newEx = [...currentPreset.exercises]; newEx.splice(idx, 1); updatePreset({ exercises: newEx }); }}><i className="fas fa-trash" /></button>
                                 </div>
                                 <div style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', gap: '0.5rem' }}>
                                    {ex.sets?.length} sérií · {getTrackTypeLabel(ex.trackType)}
                                 </div>
                              </div>
                           ))}
                           <button className="btn btn-ghost btn-sm" onClick={() => {
                              const newEx = { id: Date.now(), name: 'Nový cvik', category: 'sila', trackType: 'weight_reps', sets: [{ setNumber: 1, weight: 0, reps: 0 }] };
                              updatePreset({ exercises: [...currentPreset.exercises, newEx] });
                           }} style={{ borderStyle: 'dashed' }}><i className="fas fa-plus" /> PRIDAŤ CVIK</button>
                        </div>
                        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                           <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={deletePreset}><i className="fas fa-trash" /> ZMAZAŤ PLÁN</button>
                        </div>
                     </div>
                  </div>
               )}

               {/* 3. BOTTOM SECTION: Stats + Chart */}
               <div className="wd-bottom-grid">
                  {/* Weekly Stats Panel */}
                  <div className="panel stats-panel-legacy animate-in" style={{ animationDelay: '0.2s' }}>
                     <div className="ph" style={{ padding: '0.8rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                           <i className="fas fa-chart-bar" style={{ color: 'var(--acid)', opacity: 0.6 }} />
                           <span className="pt" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>TOTO TÝŽDEŇ</span>
                        </div>
                        <button className="btn btn-ghost btn-xs icn-only" onClick={loadWeeklyStats}><i className="fas fa-sync-alt" /></button>
                     </div>
                     <div className="pb" style={{ padding: '1.5rem' }}>
                        <div className="week-flex">
                           <div className="w-stat">
                              <div className="w-lbl">TRÉNINGY</div>
                              <div className="w-val">
                                 {weeklyStats.thisWeekWorkouts !== undefined ? weeklyStats.thisWeekWorkouts : (weeklyStats.thisWeekDays || 0)}
                              </div>
                              <div className={`w-delta ${(weeklyStats.workoutDiff || 0) >= 0 ? 'up' : 'down'}`}>
                                 {(weeklyStats.workoutDiff || 0) >= 0 ? '▲' : '▼'} {Math.abs(weeklyStats.workoutDiff || 0)} vs minule
                              </div>
                           </div>
                           <div className="w-stat">
                              <div className="w-lbl">OBJEM (KG)</div>
                              <div className="w-val">{(weeklyStats.thisWeekVolume || 0).toLocaleString()}</div>
                              <div className={`w-delta ${(weeklyStats.volumeDiff || 0) >= 0 ? 'up' : 'down'}`}>
                                 {(weeklyStats.volumeDiff || 0) >= 0 ? '▲' : '▼'} {Math.abs(weeklyStats.volumeDiff || 0).toLocaleString()}kg
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Exercise Progress Panel */}
                  <div className="panel chart-panel-legacy animate-in" style={{ animationDelay: '0.3s' }}>
                     <div className="ph" style={{ padding: '0.8rem 1.25rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                           <i className="fas fa-chart-line" style={{ color: 'var(--acid)', opacity: 0.6 }} />
                           <span className="pt" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>PROGRES CVIKU</span>
                        </div>
                     </div>
                     <div className="pb" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                           <input
                              className="fi"
                              type="text"
                              list="ex-templates-progress"
                              placeholder="Hľadať cvik..."
                              value={progressExercise}
                              onChange={e => setProgressExercise(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && loadProgress()}
                              style={{ fontSize: '0.85rem' }}
                           />
                           <datalist id="ex-templates-progress">
                              {exerciseTemplates.map(ex => <option key={ex.id || ex.name} value={ex.name} />)}
                           </datalist>
                           <button className="btn btn-acid btn-xs icn-only" onClick={loadProgress}><i className="fas fa-search" /></button>
                        </div>

                        <div className="ex-pills-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.2rem' }}>
                           {QUICK_EXERCISES.map(ex => (
                              <button
                                 key={ex}
                                 className={`ex-pill ${progressExercise === ex ? 'active' : ''}`}
                                 onClick={() => {
                                    setProgressExercise(ex);
                                    loadProgress(ex);
                                 }}
                              >
                                 {ex}
                              </button>
                           ))}
                        </div>

                        <div style={{ height: '180px', position: 'relative' }}>
                           {progressData.length > 1 ? (
                              <Line
                                 data={{
                                    labels: progressData.map(d => new Date(d.date).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })),
                                    datasets: [
                                       {
                                          label: `Max Váha (kg)`,
                                          data: progressData.map(d => d.maxWeight),
                                          borderColor: '#C8FF00',
                                          backgroundColor: 'rgba(200,255,0,0.05)',
                                          fill: true,
                                          tension: 0.3,
                                          yAxisID: 'y'
                                       },
                                       {
                                          label: `Max Reps`,
                                          data: progressData.map(d => d.maxReps),
                                          borderColor: '#00FFD1',
                                          borderDash: [5, 5],
                                          pointBackgroundColor: '#00FFD1',
                                          tension: 0.3,
                                          yAxisID: 'y1'
                                       }
                                    ]
                                 }}
                                 options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                       x: { grid: { display: false }, ticks: { font: { size: 9 }, color: 'rgba(255,255,255,0.3)' } },
                                       y: { 
                                          title: { display: true, text: 'kg', color: '#C8FF00', font: { size: 9 } },
                                          grid: { color: 'rgba(255,255,255,0.03)' }, 
                                          ticks: { font: { size: 9 }, color: '#C8FF00' } 
                                       },
                                       y1: {
                                          position: 'right',
                                          title: { display: true, text: 'reps', color: '#00FFD1', font: { size: 9 } },
                                          grid: { display: false },
                                          ticks: { font: { size: 9 }, color: '#00FFD1' }
                                       }
                                    },
                                    plugins: { legend: { display: false } }
                                 }}
                              />
                           ) : (
                              <div className="wd-empty-day" style={{ opacity: 0.3, height: '100%' }}>
                                 <i className="fas fa-chart-line" style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }} />
                                 <div style={{ fontSize: '0.75rem' }}>{progressData.length === 1 ? 'Nedostatok dát pre graf' : 'Zadajte názov cviku'}</div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* ── TRACK TYPE MODAL ── */}
         {trackTypeModal.show && (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div className="panel modal-content animate-in" style={{ width: '90%', maxWidth: '500px' }}>
                  <div className="ph" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                     <span className="pt" style={{ fontSize: '1.2rem', fontFamily: 'var(--font-d)' }}>
                        {trackTypeModal.category === 'sila' ? '💪 Sila — čo sledovať?' : '🏃 Kardio — čo sledovať?'}
                     </span>
                  </div>
                  <div className="pb" style={{ padding: '1.5rem' }}>
                     <div className="track-opt-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

                        {trackTypeModal.category === 'sila' ? (
                           <>
                              <button className={`track-opt-btn ${trackTypeModal.type === 'weight_reps' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'weight_reps' })}>
                                 <div className="ico"><i className="fas fa-dumbbell" /></div>
                                 <div className="txt">
                                    <div className="title">Váha + Opakovania</div>
                                    <div className="desc">napr. 80kg × 8 reps — klasický silový tréning</div>
                                 </div>
                              </button>
                              <button className={`track-opt-btn ${trackTypeModal.type === 'reps_only' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'reps_only' })}>
                                 <div className="ico"><i className="fas fa-sync-alt" /></div>
                                 <div className="txt">
                                    <div className="title">Len opakovania</div>
                                    <div className="desc">napr. kľuky, drepy bez váhy, angličáky</div>
                                 </div>
                              </button>
                           </>
                        ) : (
                           <>
                              <button className={`track-opt-btn ${trackTypeModal.type === 'time_only' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'time_only' })}>
                                 <div className="ico"><i className="fas fa-stopwatch" /></div>
                                 <div className="txt">
                                    <div className="title">Len čas</div>
                                    <div className="desc">napr. 5 min skákania, 3 min planku</div>
                                 </div>
                              </button>
                              <button className={`track-opt-btn ${trackTypeModal.type === 'time_distance' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'time_distance' })}>
                                 <div className="ico"><i className="fas fa-map-marker-alt" /></div>
                                 <div className="txt">
                                    <div className="title">Čas + vzdialenosť</div>
                                    <div className="desc">napr. beh 30 min / 5 km</div>
                                 </div>
                              </button>
                              <button className={`track-opt-btn ${trackTypeModal.type === 'reps_only' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'reps_only' })}>
                                 <div className="ico"><i className="fas fa-sync-alt" /></div>
                                 <div className="txt">
                                    <div className="title">Len opakovania</div>
                                    <div className="desc">napr. 50 angličákov, 20 burpees</div>
                                 </div>
                              </button>
                           </>
                        )}

                        <button className={`track-opt-btn ${trackTypeModal.type === 'custom' ? 'active' : ''}`} onClick={() => setTrackTypeModal({ ...trackTypeModal, type: 'custom' })}>
                           <div className="ico"><i className="fas fa-pen" /></div>
                           <div className="txt">
                              <div className="title">Vlastné stĺpce</div>
                              <div className="desc">Nastav si vlastné popisy podľa potreby</div>
                           </div>
                        </button>

                        {trackTypeModal.type === 'custom' && (
                           <div className="custom-input-group animate-in" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <input className="fi" placeholder="Stĺpec 1 (napr. Tempo)" value={trackTypeModal.customLabels[0]} onChange={e => {
                                    const next = [...trackTypeModal.customLabels];
                                    next[0] = e.target.value;
                                    setTrackTypeModal({ ...trackTypeModal, customLabels: next });
                                 }} />
                                 <input className="fi" placeholder="Stĺpec 2 (napr. %RM)" value={trackTypeModal.customLabels[1]} onChange={e => {
                                    const next = [...trackTypeModal.customLabels];
                                    next[1] = e.target.value;
                                    setTrackTypeModal({ ...trackTypeModal, customLabels: next });
                                 }} />
                              </div>
                           </div>
                        )}
                     </div>

                     <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button className="btn btn-acid btn-block" onClick={() => {
                           const exIdx = trackTypeModal.exerciseIdx;
                           const nextEx = [...editorExercises];
                           nextEx[exIdx] = {
                              ...nextEx[exIdx],
                              trackType: trackTypeModal.type,
                              customLabels: trackTypeModal.type === 'custom' ? JSON.stringify(trackTypeModal.customLabels) : null
                           };
                           setEditorExercises(nextEx);
                           setTrackTypeModal({ show: false, exerciseIdx: -1 });
                        }}>POTVRDIŤ</button>
                        <button className="btn btn-ghost btn-block" onClick={() => setTrackTypeModal({ show: false, exerciseIdx: -1 })}>ZRUŠIŤ</button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

export default WorkoutTab;