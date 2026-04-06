import React, { useState, useRef, useEffect } from "react";
import Toast from "../Toast";

export default function MusicTab() {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(100);
  
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
    
    // Cleanup event listeners
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.pause(); // stop music on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRepeat]); // Re-attach ended logic when repeat changes setting

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
        // Load first track but don't play immediately unless user pressed play
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
    
    // When track is loaded manually or next automatically
    // It'll play if it was playing already, except on the very first load
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
    setIsPlaying(true); // force play next
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

  const currentTitle = playlist[currentTrack]?.name || "Lokálny MP3 prehrávač";

  // Visualizer bars
  const bars = [1,2,3,4,5,6,7,8,9,10,11,12];

  return (
    <div className="grid-2 animate-in">
      <div className="panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '24px', border: '1px solid rgba(191,90,242,0.15)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        {/* Cover Art Area */}
        <div style={{ position: 'relative', width: '220px', height: '220px', marginBottom: '2rem' }}>
          <div style={{ 
            width: '100%', height: '100%', borderRadius: '30px', 
            background: 'linear-gradient(135deg, #7b2ff7, #21d4fd)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '4.5rem', color: '#fff',
            boxShadow: isPlaying ? '0 0 50px rgba(123,47,247,0.4)' : '0 15px 30px rgba(0,0,0,0.3)',
            transition: 'all 0.5s ease',
            transform: isPlaying ? 'scale(1.02)' : 'scale(1)'
          }}>
            <i className={`fas ${isPlaying ? 'fa-compact-disc fa-spin' : 'fa-music'}`} style={{ animationDuration: '3s' }}></i>
          </div>
          
          {/* Animated Visualizer Overlay */}
          {isPlaying && (
            <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '40px' }}>
              {bars.map(i => (
                <div key={i} style={{ 
                  width: '4px', background: '#fff', borderRadius: '2px', 
                  height: '20%', animation: `musicBar ${0.5 + Math.random()}s ease-in-out infinite alternate` 
                }}></div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-d)', letterSpacing: '0.02em', marginBottom: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTitle}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>{isPlaying ? 'HRAJE TERAZ' : 'POASTAVENÉ'}</div>
        </div>

        {/* Custom Progress Bar */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          <div className="music-progress" ref={progressRef} onClick={handleSeek} style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', cursor: 'pointer', overflow: 'hidden' }}>
            <div className="music-progress-fill" style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #7b2ff7, #21d4fd)', boxShadow: '0 0 10px rgba(33,212,253,0.5)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-d)' }}>
            <span>{currentTimeStr}</span>
            <span>{durationStr}</span>
          </div>
        </div>

        <div className="music-controls" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
          <button className="mc-btn" onClick={() => setIsShuffle(!isShuffle)} style={{ color: isShuffle ? "var(--acid2)" : "var(--muted)", fontSize: '1.1rem' }}>
            <i className="fas fa-random"></i>
          </button>
          <button className="mc-btn" onClick={prevTrack} style={{ fontSize: '1.4rem' }}>
            <i className="fas fa-backward"></i>
          </button>
          <button className="mc-btn play" onClick={togglePlay} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--text)', color: '#000', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: isPlaying ? '0' : '4px' }}></i>
          </button>
          <button className="mc-btn" onClick={nextTrack} style={{ fontSize: '1.4rem' }}>
            <i className="fas fa-forward"></i>
          </button>
          <button className="mc-btn" onClick={() => setIsRepeat(!isRepeat)} style={{ color: isRepeat ? "var(--acid2)" : "var(--muted)", fontSize: '1.1rem' }}>
            <i className="fas fa-redo"></i>
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '15px' }}>
          <i className={`fas ${volume == 0 ? 'fa-volume-mute' : volume < 50 ? 'fa-volume-down' : 'fa-volume-up'}`} style={{ color: 'var(--muted)', width: '20px' }}></i>
          <input type="range" className="vol-slider" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)} style={{ flex: 1, accentColor: 'var(--purple)' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', minWidth: '35px', textAlign: 'right' }}>{volume}%</span>
        </div>
      </div>

      <div className="panel">
        <div className="ph" style={{ justifyContent: "space-between" }}>
          <span className="pt">Playlist</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <label className="btn btn-acid btn-sm" style={{ cursor: "pointer", margin: 0 }}>
              <i className="fas fa-upload"></i> Nahrať hudbu
              <input type="file" multiple accept="audio/mpeg,audio/wav,audio/ogg" style={{ display: "none" }} onChange={handleFiles} />
            </label>
            {playlist.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearPlaylist} title="Vyčistiť playlist">
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
        </div>
        <div className="pb" style={{ padding: 0 }}>
          {playlist.length === 0 ? (
            <div className="empty-state" style={{ padding: "3rem" }}>
              <i className="fas fa-music"></i>
              <p>Playlist je prázdny — nahraj MP3 súbory</p>
            </div>
          ) : (
            <div className="playlist" style={{ maxHeight: '550px', overflowY: 'auto' }}>
              {playlist.map((t, idx) => {
                const isActive = idx === currentTrack;
                return (
                  <div 
                    key={idx} 
                    className={`pl-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setIsPlaying(true); loadTrack(playlist, idx); }}
                    style={{ 
                      padding: '1rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isActive ? 'rgba(123,47,247,0.1)' : 'transparent',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isActive ? 'var(--purple)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: isActive ? '#fff' : 'var(--muted)' }}>
                      {isActive ? <i className="fas fa-play" style={{ fontSize: '0.6rem' }}></i> : (idx + 1)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--purple)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem' }}>MPEG Audio Layer 3</div>
                    </div>
                    {isActive && <div className="spinner-s" style={{ width: '12px', height: '12px', border: '2px solid var(--purple)', borderTopColor: 'transparent' }}></div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
