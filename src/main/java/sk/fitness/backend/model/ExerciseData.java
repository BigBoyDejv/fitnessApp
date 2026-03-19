package sk.fitness.backend.model;

import java.util.List;

public class ExerciseData {
    private String name;
    private String category;
    private String trackType;
    private List<SetData> sets;

    // Constructors
    public ExerciseData() {}

    public ExerciseData(String name, String category, String trackType, List<SetData> sets) {
        this.name = name;
        this.category = category;
        this.trackType = trackType;
        this.sets = sets;
    }

    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTrackType() { return trackType; }
    public void setTrackType(String trackType) { this.trackType = trackType; }

    public List<SetData> getSets() { return sets; }
    public void setSets(List<SetData> sets) { this.sets = sets; }
}