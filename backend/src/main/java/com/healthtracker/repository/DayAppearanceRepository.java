package com.healthtracker.repository;

import com.healthtracker.model.DayAppearance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DayAppearanceRepository extends JpaRepository<DayAppearance, Long> {
    Optional<DayAppearance> findByDate(LocalDate date);
    List<DayAppearance> findByDateBetween(LocalDate start, LocalDate end);
}
