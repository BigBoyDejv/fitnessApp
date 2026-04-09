package sk.fitness.backend.model;

public enum AttendanceStatus {
    PENDING,   // Rezervované, čaká sa na lekciu
    WAITING,   // Na čakačke (kapacita plná)
    PRESENT,   // Zúčastnil sa
    ABSENT,    // Neprišiel (No show)
    CANCELLED  // Zrušená rezervácia
}
