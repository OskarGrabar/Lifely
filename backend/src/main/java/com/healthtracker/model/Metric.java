package com.healthtracker.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Entity
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Table(name = "metrics")
public class Metric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType type;

    // Only appears on calendar, excluded from trend charts
    @Column(nullable = false)
    private boolean calendarOnly = false;

    // Optional: unit label e.g. "kg", "hours"
    private String unit;

    // For SCALE and NUMBER types
    private Double minValue;
    private Double maxValue;

    // Color shown on the calendar for this metric's indicator
    private String color;

    public enum MetricType {
        NUMBER, SCALE, YES_NO
    }
}
