package com.healthtracker.repository;

import com.healthtracker.model.DailyEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyEntryRepository extends JpaRepository<DailyEntry, Long> {
    Optional<DailyEntry> findByDate(LocalDate date);
    List<DailyEntry> findByDateBetween(LocalDate start, LocalDate end);
    boolean existsByDate(LocalDate date);
}
