package com.healthtracker.service;

import com.healthtracker.dto.DayAppearanceDTO;
import com.healthtracker.model.DayAppearance;
import com.healthtracker.repository.DayAppearanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DayAppearanceService {

    private final DayAppearanceRepository dayAppearanceRepository;

    public List<DayAppearanceDTO> getAppearancesForMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return dayAppearanceRepository.findByDateBetween(ym.atDay(1), ym.atEndOfMonth()).stream()
                .map(DayAppearanceDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public DayAppearanceDTO getByDate(LocalDate date) {
        return dayAppearanceRepository.findByDate(date)
                .map(DayAppearanceDTO::fromEntity)
                .orElse(null);
    }

    public DayAppearanceDTO upsertAppearance(LocalDate date, DayAppearanceDTO dto) {
        DayAppearance appearance = dayAppearanceRepository.findByDate(date)
                .orElseGet(() -> {
                    DayAppearance da = new DayAppearance();
                    da.setDate(date);
                    return da;
                });
        appearance.setColor(dto.getColor());
        appearance.setEmoji(dto.getEmoji());
        appearance.setLabel(dto.getLabel());
        return DayAppearanceDTO.fromEntity(dayAppearanceRepository.save(appearance));
    }

    public void deleteAppearance(LocalDate date) {
        dayAppearanceRepository.findByDate(date)
                .ifPresent(dayAppearanceRepository::delete);
    }
}
