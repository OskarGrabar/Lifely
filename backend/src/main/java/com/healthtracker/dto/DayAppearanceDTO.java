package com.healthtracker.dto;

import com.healthtracker.model.DayAppearance;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DayAppearanceDTO {
    private Long id;
    private LocalDate date;
    private String color;
    private String emoji;
    private String label;

    public static DayAppearanceDTO fromEntity(DayAppearance da) {
        DayAppearanceDTO dto = new DayAppearanceDTO();
        dto.setId(da.getId());
        dto.setDate(da.getDate());
        dto.setColor(da.getColor());
        dto.setEmoji(da.getEmoji());
        dto.setLabel(da.getLabel());
        return dto;
    }
}
