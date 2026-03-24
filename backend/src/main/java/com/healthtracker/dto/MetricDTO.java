package com.healthtracker.dto;

import com.healthtracker.model.Metric;
import lombok.Data;

@Data
public class MetricDTO {
    private Long id;
    private String name;
    private Metric.MetricType type;
    private boolean calendarOnly;
    private String unit;
    private Double minValue;
    private Double maxValue;
    private String color;

    public static MetricDTO fromEntity(Metric m) {
        MetricDTO dto = new MetricDTO();
        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setType(m.getType());
        dto.setCalendarOnly(m.isCalendarOnly());
        dto.setUnit(m.getUnit());
        dto.setMinValue(m.getMinValue());
        dto.setMaxValue(m.getMaxValue());
        dto.setColor(m.getColor());
        return dto;
    }
}
