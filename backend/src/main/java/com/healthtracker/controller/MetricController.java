package com.healthtracker.controller;

import com.healthtracker.dto.MetricDTO;
import com.healthtracker.service.MetricService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class MetricController {

    private final MetricService metricService;

    @GetMapping
    public List<MetricDTO> getAll() {
        return metricService.getAllMetrics();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MetricDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(metricService.getMetricById(id));
    }

    @PostMapping
    public ResponseEntity<MetricDTO> create(@RequestBody MetricDTO dto) {
        return ResponseEntity.ok(metricService.createMetric(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MetricDTO> update(@PathVariable Long id, @RequestBody MetricDTO dto) {
        return ResponseEntity.ok(metricService.updateMetric(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        metricService.deleteMetric(id);
        return ResponseEntity.noContent().build();
    }
}
