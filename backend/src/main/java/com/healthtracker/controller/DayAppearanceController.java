package com.healthtracker.controller;

import com.healthtracker.dto.DayAppearanceDTO;
import com.healthtracker.service.DayAppearanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appearances")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class DayAppearanceController {

    private final DayAppearanceService dayAppearanceService;

    // GET /api/appearances?year=2026&month=3
    @GetMapping
    public List<DayAppearanceDTO> getByMonth(
            @RequestParam int year,
            @RequestParam int month) {
        return dayAppearanceService.getAppearancesForMonth(year, month);
    }

    // GET /api/appearances/2026-03-23
    @GetMapping("/{date}")
    public ResponseEntity<DayAppearanceDTO> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DayAppearanceDTO app = dayAppearanceService.getByDate(date);
        return app != null ? ResponseEntity.ok(app) : ResponseEntity.notFound().build();
    }

    // PUT /api/appearances/2026-03-23
    @PutMapping("/{date}")
    public ResponseEntity<DayAppearanceDTO> upsert(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody DayAppearanceDTO dto) {
        return ResponseEntity.ok(dayAppearanceService.upsertAppearance(date, dto));
    }

    // DELETE /api/appearances/2026-03-23
    @DeleteMapping("/{date}")
    public ResponseEntity<Void> delete(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        dayAppearanceService.deleteAppearance(date);
        return ResponseEntity.noContent().build();
    }
}
