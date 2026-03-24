package com.healthtracker.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Table(name = "day_appearances")
public class DayAppearance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    // Hex color or CSS color string
    private String color;

    // Emoji character(s) for the day
    private String emoji;

    // Optional short label shown on the calendar cell
    private String label;
}
