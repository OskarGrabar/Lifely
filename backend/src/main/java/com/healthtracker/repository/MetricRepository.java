package com.healthtracker.repository;

import com.healthtracker.model.Metric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MetricRepository extends JpaRepository<Metric, Long> {
    List<Metric> findByCalendarOnlyFalse();
    List<Metric> findByCalendarOnly(boolean calendarOnly);
}
