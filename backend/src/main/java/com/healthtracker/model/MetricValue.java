package com.healthtracker.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Getter
@Setter
@ToString(exclude = "dailyEntry")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Table(name = "metric_values")
public class MetricValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_entry_id", nullable = false)
    @JsonIgnore
    private DailyEntry dailyEntry;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "metric_id", nullable = false)
    private Metric metric;

    // Stored as string; parse based on metric type
    // "value" is a reserved word in H2, so we map to a safe column name
    @Column(name = "entry_value", nullable = false)
    private String value;
}
