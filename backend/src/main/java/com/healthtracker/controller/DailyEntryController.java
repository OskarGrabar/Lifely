package com.healthtracker.controller;

import com.healthtracker.dto.DailyEntryDTO;
import com.healthtracker.service.DailyEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/entries")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DailyEntryController {

    private final DailyEntryService dailyEntryService;

    // GET /api/entries?year=2026&month=3
    @GetMapping
    public List<DailyEntryDTO> getByMonth(
            @RequestParam int year,
            @RequestParam int month) {
        return dailyEntryService.getEntriesForMonth(year, month);
    }

    // GET /api/entries/2026-03-23
    @GetMapping("/{date}")
    public ResponseEntity<DailyEntryDTO> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyEntryDTO entry = dailyEntryService.getEntryByDate(date);
        return entry != null ? ResponseEntity.ok(entry) : ResponseEntity.notFound().build();
    }

    // PUT /api/entries/2026-03-23
    @PutMapping("/{date}")
    public ResponseEntity<DailyEntryDTO> saveEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody DailyEntryDTO dto) {
        return ResponseEntity.ok(dailyEntryService.saveEntry(date, dto));
    }

    // DELETE /api/entries/2026-03-23
    @DeleteMapping("/{date}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        dailyEntryService.deleteEntry(date);
        return ResponseEntity.noContent().build();
    }

    // GET /api/entries/range?start=2026-01-01&end=2026-03-31  (for charts)
    @GetMapping("/range")
    public List<DailyEntryDTO> getRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return dailyEntryService.getEntriesForRange(start, end);
    }
}
