package com.healthtracker.service;

import com.healthtracker.dto.DailyEntryDTO;
import com.healthtracker.model.DailyEntry;
import com.healthtracker.model.Metric;
import com.healthtracker.model.MetricValue;
import com.healthtracker.repository.DailyEntryRepository;
import com.healthtracker.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyEntryService {

    private final DailyEntryRepository dailyEntryRepository;
    private final MetricRepository metricRepository;

    public List<DailyEntryDTO> getEntriesForMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        return dailyEntryRepository.findByDateBetween(start, end).stream()
                .map(DailyEntryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public DailyEntryDTO getEntryByDate(LocalDate date) {
        return dailyEntryRepository.findByDate(date)
                .map(DailyEntryDTO::fromEntity)
                .orElse(null);
    }

    @Transactional
    public DailyEntryDTO saveEntry(LocalDate date, DailyEntryDTO dto) {
        // Persist/merge the entry skeleton first so it always has a DB-managed ID
        DailyEntry entry = dailyEntryRepository.findByDate(date)
                .orElseGet(() -> {
                    DailyEntry e = new DailyEntry();
                    e.setDate(date);
                    return dailyEntryRepository.save(e);
                });

        entry.setNotes(dto.getNotes());

        // Clear existing values and flush immediately so Hibernate issues the
        // DELETEs before it tries to INSERT the new rows (avoids UK / orphan
        // removal ordering issues).
        entry.getValues().clear();
        dailyEntryRepository.saveAndFlush(entry);

        if (dto.getValues() != null) {
            for (DailyEntryDTO.MetricValueDTO mvDto : dto.getValues()) {
                Metric metric = metricRepository.findById(mvDto.getMetricId())
                        .orElseThrow(() -> new RuntimeException("Metric not found: " + mvDto.getMetricId()));
                MetricValue mv = new MetricValue();
                mv.setDailyEntry(entry);
                mv.setMetric(metric);
                mv.setValue(mvDto.getValue());
                entry.getValues().add(mv);
            }
        }

        return DailyEntryDTO.fromEntity(dailyEntryRepository.saveAndFlush(entry));
    }

    @Transactional
    public void deleteEntry(LocalDate date) {
        dailyEntryRepository.findByDate(date)
                .ifPresent(dailyEntryRepository::delete);
    }

    public List<DailyEntryDTO> getEntriesForRange(LocalDate start, LocalDate end) {
        return dailyEntryRepository.findByDateBetween(start, end).stream()
                .map(DailyEntryDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
