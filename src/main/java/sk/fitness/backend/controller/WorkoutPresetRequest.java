package sk.fitness.backend.controller;

import sk.fitness.backend.model.ExerciseData;
import java.util.List;

public class WorkoutPresetRequest {
    private String name;
    private List<ExerciseData> exercises;

    // Constructors
    public WorkoutPresetRequest() {}

    public WorkoutPresetRequest(String name, List<ExerciseData> exercises) {
        this.name = name;
        this.exercises = exercises;
    }

    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<ExerciseData> getExercises() { return exercises; }
    public void setExercises(List<ExerciseData> exercises) { this.exercises = exercises; }
}