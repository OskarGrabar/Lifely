package com.healthtracker.dto;

import com.healthtracker.model.DailyEntry;
import com.healthtracker.model.MetricValue;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class DailyEntryDTO {
    private Long id;
    private LocalDate date;
    private String notes;
    private List<MetricValueDTO> values;

    @Data
    public static class MetricValueDTO {
        private Long id;
        private Long metricId;
        private String metricName;
        private String value;

        public static MetricValueDTO fromEntity(MetricValue mv) {
            MetricValueDTO dto = new MetricValueDTO();
            dto.setId(mv.getId());
            dto.setMetricId(mv.getMetric().getId());
            dto.setMetricName(mv.getMetric().getName());
            dto.setValue(mv.getValue());
            return dto;
        }
    }

    public static DailyEntryDTO fromEntity(DailyEntry entry) {
        DailyEntryDTO dto = new DailyEntryDTO();
        dto.setId(entry.getId());
        dto.setDate(entry.getDate());
        dto.setNotes(entry.getNotes());
        dto.setValues(entry.getValues().stream()
                .map(MetricValueDTO::fromEntity)
                .collect(Collectors.toList()));
        return dto;
    }
}
