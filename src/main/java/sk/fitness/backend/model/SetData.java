package sk.fitness.backend.model;

public class SetData {
    private Double weight;
    private Integer reps;
    private Integer duration; // pre časové cvičenia
    private Integer distance; // pre vzdialenosť

    // Constructors
    public SetData() {}

    public SetData(Double weight, Integer reps) {
        this.weight = weight;
        this.reps = reps;
    }

    // Getters and setters
    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Integer getReps() { return reps; }
    public void setReps(Integer reps) { this.reps = reps; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public Integer getDistance() { return distance; }
    public void setDistance(Integer distance) { this.distance = distance; }
}