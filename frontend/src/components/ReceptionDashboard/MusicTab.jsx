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

  return (
    <div className="grid-2">
      <div>
        <div className="music-player">
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, var(--purple), var(--blue))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "2rem", color: "#fff", boxShadow: "0 10px 30px rgba(191,90,242,0.3)" }}>
            <i className="fas fa-music"></i>
          </div>
          <div className="music-title">{currentTitle}</div>
          <div className="music-artist">Fitness Gym</div>
          
          <div className="music-progress" ref={progressRef} onClick={handleSeek}>
            <div className="music-progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginBottom: "1.2rem" }}>
            <span>{currentTimeStr}</span>
            <span>{durationStr}</span>
          </div>

          <div className="music-controls">
            <button className="mc-btn" onClick={() => setIsShuffle(!isShuffle)} style={{ color: isShuffle ? "var(--purple)" : "var(--muted)" }}>
              <i className="fas fa-random"></i>
            </button>
            <button className="mc-btn" onClick={prevTrack}>
              <i className="fas fa-backward"></i>
            </button>
            <button className="mc-btn play" onClick={togglePlay}>
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>
            <button className="mc-btn" onClick={nextTrack}>
              <i className="fas fa-forward"></i>
            </button>
            <button className="mc-btn" onClick={() => setIsRepeat(!isRepeat)} style={{ color: isRepeat ? "var(--purple)" : "var(--muted)" }}>
              <i className="fas fa-redo"></i>
            </button>
          </div>

          <div className="music-vol">
            <i className="fas fa-volume-down" style={{ color: "var(--muted)", fontSize: "0.85rem" }}></i>
            <input type="range" className="vol-slider" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)} />
            <i className="fas fa-volume-up" style={{ color: "var(--muted)", fontSize: "0.85rem" }}></i>
          </div>
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
            <div className="playlist">
              {playlist.map((t, idx) => {
                const isActive = idx === currentTrack;
                return (
                  <div 
                    key={idx} 
                    className={`pl-item ${isActive ? 'active' : ''}`}
                    onClick={() => { setIsPlaying(true); loadTrack(playlist, idx); }}
                  >
                    <div className="pl-num">
                      {isActive ? <i className="fas fa-volume-up"></i> : (idx + 1)}
                    </div>
                    <div className="pl-name">
                      {t.name}
                    </div>
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
