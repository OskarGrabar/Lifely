package com.healthtracker.service;

import com.healthtracker.dto.MetricDTO;
import com.healthtracker.model.Metric;
import com.healthtracker.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MetricService {

    private final MetricRepository metricRepository;

    public List<MetricDTO> getAllMetrics() {
        return metricRepository.findAll().stream()
                .map(MetricDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public MetricDTO getMetricById(Long id) {
        return metricRepository.findById(id)
                .map(MetricDTO::fromEntity)
                .orElseThrow(() -> new RuntimeException("Metric not found: " + id));
    }

    public MetricDTO createMetric(MetricDTO dto) {
        Metric metric = new Metric();
        applyDTO(dto, metric);
        return MetricDTO.fromEntity(metricRepository.save(metric));
    }

    public MetricDTO updateMetric(Long id, MetricDTO dto) {
        Metric metric = metricRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Metric not found: " + id));
        applyDTO(dto, metric);
        return MetricDTO.fromEntity(metricRepository.save(metric));
    }

    public void deleteMetric(Long id) {
        metricRepository.deleteById(id);
    }

    private void applyDTO(MetricDTO dto, Metric metric) {
        metric.setName(dto.getName());
        metric.setType(dto.getType());
        metric.setCalendarOnly(dto.isCalendarOnly());
        metric.setUnit(dto.getUnit());
        metric.setMinValue(dto.getMinValue());
        metric.setMaxValue(dto.getMaxValue());
        metric.setColor(dto.getColor());
    }
}
