import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "../Toast";

export default function MusicTab() {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(80);
  
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState("0:00");
  const [durationStr, setDurationStr] = useState("0:00");
  
  const [toastMsg, setToastMsg] = useState(null);
  
  const audioRef = useRef(new Audio());
  const progressRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setProgressPercent((audio.currentTime / audio.duration) * 100);
      setCurrentTimeStr(fmtSec(audio.currentTime));
      setDurationStr(fmtSec(audio.duration));
    };

    const onEnded = () => {
      if (isRepeat) {
        audio.play().catch(e => console.error("Auto play error:", e));
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRepeat, isShuffle, currentTrack]); 

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const showToast = (msg, type = "ok") => {
    setToastMsg({ msg, type });
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newTracks = files.map(f => ({
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f)
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];
      if (currentTrack === -1 && updated.length > 0) {
        setTimeout(() => loadTrack(updated, 0), 10); 
      }
      return updated;
    });

    showToast(`Pridaných ${files.length} skladieb`, "ok");
    e.target.value = "";
  };

  const loadTrack = (list, idx) => {
    if (idx < 0 || idx >= list.length) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTrack(idx);
    audio.src = list[idx].url;
    setProgressPercent(0);
    setCurrentTimeStr("0:00");
    
    if (isPlaying || audio.played.length > 0) {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (playlist.length === 0) return showToast("Najprv nahraj hudbu", "err");
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack === -1) {
      loadTrack(playlist, 0);
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(e => showToast("Nedá sa prehrať", "err"));
    }
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    let n = isShuffle ? Math.floor(Math.random() * playlist.length) : (currentTrack + 1) % playlist.length;
    setIsPlaying(true);
    setTimeout(() => {
      loadTrack(playlist, n);
      audioRef.current.play().catch(e => console.error(e));
    }, 50);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    let p = currentTrack <= 0 ? playlist.length - 1 : currentTrack - 1;
    setIsPlaying(true);
    setTimeout(() => {
      loadTrack(playlist, p);
      audioRef.current.play().catch(e => console.error(e));
    }, 50);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !audio.duration || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
  };

  const fmtSec = (s) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentTrack(-1);
    setIsPlaying(false);
    setProgressPercent(0);
    setCurrentTimeStr("0:00");
    setDurationStr("0:00");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  const currentTitle = playlist[currentTrack]?.name || "Gym Music Player";
  const bars = Array.from({ length: 15 }, (_, i) => i);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid-2 music-reception">
      <motion.div variants={itemVariants} className="panel glass-panel player-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(191,90,242,0.2)' }}>
        <div className="disc-wrap" style={{ position: 'relative', width: '240px', height: '240px', marginBottom: '2.5rem' }}>
          <motion.div 
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{ 
              width: '100%', height: '100%', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #121212 10%, #2a2a2a 40%, #121212 50%, #2a2a2a 60%, #121212 90%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '6px solid rgba(255,255,255,0.05)',
              boxShadow: isPlaying ? '0 0 40px rgba(191,90,242,0.3)' : '0 10px 30px rgba(0,0,0,0.5)',
              position: 'relative', overflow: 'hidden'
            }}
          >
             <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #7b2ff7, #21d4fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '4px solid #121212' }}>
                <i className="fas fa-drum" style={{ fontSize: '2rem' }}></i>
             </div>
             {/* Dynamic Visualizer around the center */}
             {isPlaying && (
               <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {bars.map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: ['40px', '120px', '40px'] }}
                      transition={{ duration: Math.random() + 0.5, repeat: Infinity }}
                      style={{ 
                        position: 'absolute', 
                        width: '2px', 
                        background: 'rgba(191,90,242,0.2)', 
                        transform: `rotate(${i * (360/bars.length)}deg) translateY(-85px)` 
                      }} 
                    />
                  ))}
               </div>
             )}
          </motion.div>
          {/* Needle / Stylus */}
          <motion.div 
            animate={{ rotate: isPlaying ? 25 : 0 }}
            style={{ position: 'absolute', top: -10, right: 10, width: '80px', height: '10px', background: '#ccc', borderRadius: '5px', originX: '100%', originY: '50%', transform: 'rotate(0deg)', zIndex: 1, boxShadow: '0 5px 10px rgba(0,0,0,0.3)' }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 950, fontFamily: 'var(--font-d)', color: '#fff', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
             {currentTitle.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 900, color: isPlaying ? 'var(--purple)' : 'var(--muted)', letterSpacing: '0.2em' }}>
             {isPlaying ? 'ACTIVE STREAM' : 'SYSTEM PAUSED'}
          </div>
        </div>

        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <div ref={progressRef} onClick={handleSeek} style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', cursor: 'pointer', position: 'relative' }}>
            <motion.div layout className="progress-fill" style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #7b2ff7, #21d4fd)', borderRadius: '3px', boxShadow: '0 0 15px rgba(123,47,247,0.5)' }} />
            <motion.div style={{ position: 'absolute', left: `${progressPercent}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', border: '3px solid var(--purple)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 900, color: 'var(--muted)', marginTop: '0.8rem', fontFamily: 'monospace' }}>
            <span>{currentTimeStr}</span>
            <span>{durationStr}</span>
          </div>
        </div>

        <div className="music-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsShuffle(!isShuffle)} style={{ border: 'none', background: 'none', color: isShuffle ? 'var(--acid2)' : 'var(--muted)', fontSize: '1rem', cursor: 'pointer' }}><i className="fas fa-random" /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prevTrack} style={{ border: 'none', background: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}><i className="fas fa-backward" /></motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} 
            onClick={togglePlay} 
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', color: '#000', border: 'none', fontSize: '1.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: isPlaying ? 0 : 5 }}></i>
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={nextTrack} style={{ border: 'none', background: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}><i className="fas fa-forward" /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsRepeat(!isRepeat)} style={{ border: 'none', background: 'none', color: isRepeat ? 'var(--acid2)' : 'var(--muted)', fontSize: '1rem', cursor: 'pointer' }}><i className="fas fa-redo" /></motion.button>
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '18px', border: '1px solid var(--border)' }}>
          <i className={`fas ${volume === 0 ? 'fa-volume-mute' : volume < 50 ? 'fa-volume-down' : 'fa-volume-up'}`} style={{ color: 'var(--muted)', fontSize: '1rem' }} />
          <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)} style={{ flex: 1, height: '4px', accentColor: 'var(--purple)', cursor: 'pointer' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--muted)', minWidth: '40px', textAlign: 'right', fontFamily: 'monospace' }}>{volume}%</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="panel glass-panel playlist-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="ph" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="pt"><i className="fas fa-list-ul" style={{marginRight: '0.8rem', color: 'var(--purple)'}} />Knižnica skladieb</span>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <label className="btn btn-acid btn-xs" style={{ cursor: 'pointer', borderRadius: '8px' }}>
              <i className="fas fa-plus"></i> PRIDAŤ
              <input type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={handleFiles} />
            </label>
            {playlist.length > 0 && <button className="btn btn-ghost btn-xs" onClick={clearPlaylist} style={{ borderRadius: '8px' }}><i className="fas fa-trash"></i></button>}
          </div>
        </div>
        <div className="pb" style={{ padding: 0, flex: 1, overflowY: 'auto' }}>
          <AnimatePresence>
            {playlist.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state" style={{ height: '400px' }}>
                <i className="fas fa-compact-disc" style={{ fontSize: '4rem', opacity: 0.1, marginBottom: '1.5rem' }} />
                <p style={{ fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.1em' }}>NAHRAJTE SVOJU HUDBU (MP3)</p>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="playlist-list">
                {playlist.map((t, idx) => {
                  const isActive = idx === currentTrack;
                  return (
                    <motion.div 
                      key={idx} 
                      whileHover={{ x: 10, background: 'rgba(191,90,242,0.05)' }} 
                      onClick={() => { setIsPlaying(true); loadTrack(playlist, idx); }}
                      style={{ 
                        padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', 
                        borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        background: isActive ? 'rgba(191,90,242,0.08)' : 'transparent',
                        position: 'relative'
                      }}
                    >
                      {isActive && <motion.div layoutId="track-active" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--purple)' }} />}
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isActive ? 'var(--purple)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: isActive ? '#fff' : 'var(--muted)', fontSize: '0.8rem' }}>
                        {isActive ? <i className="fas fa-play" style={{ fontSize: '0.6rem' }} /> : (idx + 1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: isActive ? 900 : 700, color: isActive ? '#fff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem', textTransform: 'uppercase' }}>AUDIO STREAM</div>
                      </div>
                      {isActive && (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
                          {[1,2,3].map(b => (
                            <motion.div key={b} animate={{ height: ['4px', '14px', '4px'] }} transition={{ duration: 0.5 + b/5, repeat: Infinity }} style={{ width: '3px', background: 'var(--purple)', borderRadius: '1px' }} />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        .music-reception .mc-btn { transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .music-reception .pl-item:hover { transform: translateX(10px); }
      `}</style>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </motion.div>
  );
}
