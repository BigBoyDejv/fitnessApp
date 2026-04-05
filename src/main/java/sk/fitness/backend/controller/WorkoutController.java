package sk.fitness.backend.controller;

import sk.fitness.backend.model.*;
import sk.fitness.backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    private final WorkoutLogRepository logRepo;
    private final WorkoutExerciseRepository exRepo;
    private final WorkoutSetRepository setRepo;
    private final UserRepository userRepo;

    public WorkoutController(WorkoutLogRepository logRepo, WorkoutExerciseRepository exRepo,
                             WorkoutSetRepository setRepo, UserRepository userRepo) {
        this.logRepo = logRepo;
        this.exRepo = exRepo;
        this.setRepo = setRepo;
        this.userRepo = userRepo;
    }

    // GET /api/workouts/my
    @GetMapping("/my")
    public ResponseEntity<?> getMyWorkouts(@AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        List<Map<String, Object>> result = logRepo
                .findByUserIdOrderByWorkoutDateDesc(user.getId())
                .stream().map(this::logToDto).toList();
        return ResponseEntity.ok(result);
    }

    // GET /api/workouts/calendar?year=2026&month=3
    @GetMapping("/calendar")
    public ResponseEntity<?> getCalendarDays(
            @RequestParam int year, @RequestParam int month,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        List<String> dates = logRepo.findDatesByUserId(user.getId(), from, to)
                .stream().map(LocalDate::toString).toList();
        return ResponseEntity.ok(dates);
    }

    // GET /api/workouts/day?date=2026-03-15
    @GetMapping("/day")
    public ResponseEntity<?> getWorkoutByDay(
            @RequestParam String date,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        LocalDate d = LocalDate.parse(date);
        List<WorkoutLog> logs = logRepo
                .findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(user.getId(), d, d);
        if (logs.isEmpty()) return ResponseEntity.ok(null);
        return ResponseEntity.ok(logToFullDto(logs.get(0)));
    }

    // POST /api/workouts
    @PostMapping
    public ResponseEntity<?> createWorkout(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        WorkoutLog log = new WorkoutLog();
        log.setUser(user);
        log.setWorkoutDate(LocalDate.parse((String) body.get("date")));
        log.setTitle((String) body.getOrDefault("title", "Tréning"));
        log.setNotes((String) body.get("notes"));
        if (body.get("feeling") != null)
            log.setFeeling(((Number) body.get("feeling")).intValue());
        logRepo.save(log);

        List<Map<String, Object>> exercises = (List<Map<String, Object>>) body.get("exercises");
        if (exercises != null) saveExercises(log, exercises);

        return ResponseEntity.ok(logToFullDto(log));
    }

    // PUT /api/workouts/{id}
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateWorkout(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        WorkoutLog log = logRepo.findById(UUID.fromString(id)).orElse(null);
        if (log == null) return ResponseEntity.notFound().build();
        if (!log.getUser().getId().equals(user.getId())) return ResponseEntity.status(403).build();

        if (body.containsKey("title")) log.setTitle((String) body.get("title"));
        if (body.containsKey("notes")) log.setNotes((String) body.get("notes"));
        if (body.containsKey("feeling") && body.get("feeling") != null)
            log.setFeeling(((Number) body.get("feeling")).intValue());
        logRepo.save(log);

        List<WorkoutExercise> oldEx = exRepo.findByWorkoutLogIdOrderBySortOrder(log.getId());
        for (WorkoutExercise ex : oldEx) setRepo.deleteByExerciseId(ex.getId());
        exRepo.deleteAll(oldEx);

        List<Map<String, Object>> exercises = (List<Map<String, Object>>) body.get("exercises");
        if (exercises != null) saveExercises(log, exercises);

        return ResponseEntity.ok(logToFullDto(log));
    }

    // DELETE /api/workouts/{id}
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteWorkout(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        WorkoutLog log = logRepo.findById(UUID.fromString(id)).orElse(null);
        if (log == null) return ResponseEntity.notFound().build();
        if (!log.getUser().getId().equals(user.getId())) return ResponseEntity.status(403).build();
        List<WorkoutExercise> exs = exRepo.findByWorkoutLogIdOrderBySortOrder(log.getId());
        for (WorkoutExercise ex : exs) setRepo.deleteByExerciseId(ex.getId());
        exRepo.deleteAll(exs);
        logRepo.delete(log);
        return ResponseEntity.ok(Map.of("message", "Tréning zmazaný"));
    }

    // GET /api/workouts/progress?exercise=Bench+Press
    @GetMapping("/progress")
    public ResponseEntity<?> getProgress(
            @RequestParam String exercise,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        List<Object[]> rows = exRepo.findProgressForExercise(user.getId(), exercise);
        List<Map<String, Object>> result = rows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("date", r[0].toString());
            m.put("maxWeight", r[1]);
            m.put("maxReps", r[2]);
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    // GET /api/workouts/weekly-stats
    @GetMapping("/weekly-stats")
    public ResponseEntity<?> getWeeklyStats(@AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        LocalDate today = LocalDate.now();
        LocalDate thisMonday = today.with(java.time.DayOfWeek.MONDAY);
        LocalDate lastMonday = thisMonday.minusWeeks(1);
        LocalDate lastSunday = thisMonday.minusDays(1);

        List<WorkoutLog> thisWeek = logRepo.findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(
                user.getId(), thisMonday, today);
        List<WorkoutLog> lastWeek = logRepo.findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(
                user.getId(), lastMonday, lastSunday);

        double thisVol = 0, lastVol = 0;
        for (WorkoutLog log : thisWeek) {
            try {
                Map<String, Object> full = logToFullDto(log);
                Object vol = full.get("totalVolume");
                if (vol != null) thisVol += ((Number) vol).doubleValue();
            } catch (Exception ignored) {}
        }
        for (WorkoutLog log : lastWeek) {
            try {
                Map<String, Object> full = logToFullDto(log);
                Object vol = full.get("totalVolume");
                if (vol != null) lastVol += ((Number) vol).doubleValue();
            } catch (Exception ignored) {}
        }

        // Počet unikátnych dní s tréningom
        long thisWeekDays = thisWeek.stream()
                .map(w -> w.getWorkoutDate().toString())
                .distinct().count();
        long lastWeekDays = lastWeek.stream()
                .map(w -> w.getWorkoutDate().toString())
                .distinct().count();

        Map<String, Object> result = new HashMap<>();
        result.put("thisWeekWorkouts", thisWeek.size());
        result.put("lastWeekWorkouts", lastWeek.size());
        result.put("thisWeekDays", thisWeekDays);
        result.put("lastWeekDays", lastWeekDays);
        result.put("thisWeekVolume", Math.round(thisVol * 10.0) / 10.0);
        result.put("lastWeekVolume", Math.round(lastVol * 10.0) / 10.0);
        result.put("volumeDiff", Math.round((thisVol - lastVol) * 10.0) / 10.0);
        result.put("workoutDiff", (int) thisWeekDays - (int) lastWeekDays);
        return ResponseEntity.ok(result);
    }

    // ── Pomocné ──────────────────────────────────────────────────────────────

    private void saveExercises(WorkoutLog log, List<Map<String, Object>> exercises) {
        for (int i = 0; i < exercises.size(); i++) {
            Map<String, Object> exData = exercises.get(i);
            WorkoutExercise ex = new WorkoutExercise();
            ex.setWorkoutLog(log);
            ex.setExerciseName((String) exData.get("name"));
            ex.setCategory((String) exData.getOrDefault("category", "sila"));
            // Ulož trackType ak existuje
            if (exData.get("trackType") != null)
                ex.setTrackType((String) exData.get("trackType"));
            ex.setSortOrder(i);
            exRepo.save(ex);

            List<Map<String, Object>> sets = (List<Map<String, Object>>) exData.get("sets");
            if (sets != null) {
                for (int j = 0; j < sets.size(); j++) {
                    Map<String, Object> setData = sets.get(j);
                    WorkoutSet s = new WorkoutSet();
                    s.setExercise(ex);
                    s.setSetNumber(j + 1);
                    if (setData.get("reps") != null)
                        s.setReps(((Number) setData.get("reps")).intValue());
                    if (setData.get("weight") != null)
                        s.setWeightKg(((Number) setData.get("weight")).doubleValue());
                    if (setData.get("duration") != null)
                        s.setDurationSeconds(((Number) setData.get("duration")).intValue());
                    if (setData.get("isPr") != null)
                        s.setIsPr((Boolean) setData.get("isPr"));
                    if (setData.get("notes") != null)
                        s.setNotes((String) setData.get("notes"));
                    setRepo.save(s);
                }
            }
        }
    }

    private Map<String, Object> logToDto(WorkoutLog log) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", log.getId().toString());
        m.put("date", log.getWorkoutDate().toString());
        m.put("title", log.getTitle());
        m.put("notes", log.getNotes());
        m.put("feeling", log.getFeeling());
        return m;
    }

    private Map<String, Object> logToFullDto(WorkoutLog log) {
        Map<String, Object> m = logToDto(log);
        List<WorkoutExercise> exs = exRepo.findByWorkoutLogIdOrderBySortOrder(log.getId());
        List<Map<String, Object>> exList = exs.stream().map(ex -> {
            Map<String, Object> em = new HashMap<>();
            em.put("id", ex.getId().toString());
            em.put("name", ex.getExerciseName());
            em.put("category", ex.getCategory());
            em.put("trackType", ex.getTrackType() != null ? ex.getTrackType() : "weight_reps");

            List<WorkoutSet> sets = setRepo.findByExerciseIdOrderBySetNumber(ex.getId());
            List<Map<String, Object>> setList = sets.stream().map(s -> {
                Map<String, Object> sm = new HashMap<>();
                sm.put("id", s.getId().toString());
                sm.put("setNumber", s.getSetNumber());
                sm.put("reps", s.getReps());
                sm.put("weight", s.getWeightKg());
                sm.put("duration", s.getDurationSeconds());
                sm.put("isPr", s.getIsPr());
                sm.put("notes", s.getNotes());
                return sm;
            }).toList();
            em.put("sets", setList);

            // Objem — len pre silové cviky (weight * reps)
            String trackType = ex.getTrackType() != null ? ex.getTrackType() : "weight_reps";
            double volume = 0;
            if ("weight_reps".equals(trackType) || "custom".equals(trackType)) {
                volume = sets.stream()
                        .mapToDouble(s -> (s.getReps() != null ? s.getReps() : 0)
                                * (s.getWeightKg() != null ? s.getWeightKg() : 0))
                        .sum();
            }
            em.put("totalVolume", Math.round(volume * 10.0) / 10.0);
            return em;
        }).toList();
        m.put("exercises", exList);

        // Celkový objem tréning
        double totalVol = exList.stream()
                .mapToDouble(e -> ((Number) e.get("totalVolume")).doubleValue()).sum();
        m.put("totalVolume", Math.round(totalVol * 10.0) / 10.0);
        return m;
    }

    private User resolve(UserDetails ud) {
        if (ud == null) return null;
        return userRepo.findByEmail(ud.getUsername()).orElse(null);
    }
}