package vn.syp.tms.catalog;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public interface CatalogDtos {
    
    // Environment
    record EnvironmentDto(Long id, Long projectId, @Size(max=32) String code, @Size(max=100) String name, @Size(max=500) String description, boolean active, long version) {}
    record CreateEnvironment(@NotBlank @Size(max=32) String code, @NotBlank @Size(max=100) String name, @Size(max=500) String description) {}
    record UpdateEnvironment(@Pattern(regexp="(?s).*\\S.*") @Size(max=100) String name, @Size(max=500) String description, Boolean active, @NotNull @PositiveOrZero Long expectedVersion) {}
    
    // Build
    record BuildDto(Long id, Long projectId, @Size(max=50) String versionLabel, @Size(max=50) String buildNumber, @Size(max=32) String platform, @Size(max=500) String notes, LocalDate releasedAt, long version) {}
    record CreateBuild(@NotBlank @Size(max=50) String versionLabel, @Size(max=50) String buildNumber, @NotBlank @Size(max=32) String platform, @Size(max=500) String notes, LocalDate releasedAt) {}
    record UpdateBuild(@Pattern(regexp="(?s).*\\S.*") @Size(max=50) String versionLabel, @Size(max=50) String buildNumber, @Pattern(regexp="(?s).*\\S.*") @Size(max=32) String platform, @Size(max=500) String notes, LocalDate releasedAt, @NotNull @PositiveOrZero Long expectedVersion, @Size(max=1) java.util.List<@Pattern(regexp="releasedAt") String> clearDates) {}
    
    // Device
    record DeviceDto(Long id, Long projectId, @Size(max=32) String code, @Size(max=100) String name, @Size(max=100) String model, @Size(max=50) String osName, @Size(max=50) String osVersion, boolean active, long version) {}
    record CreateDevice(@NotBlank @Size(max=32) String code, @NotBlank @Size(max=100) String name, @Size(max=100) String model, @Size(max=50) String osName, @Size(max=50) String osVersion) {}
    record UpdateDevice(@Pattern(regexp="(?s).*\\S.*") @Size(max=100) String name, @Size(max=100) String model, @Size(max=50) String osName, @Size(max=50) String osVersion, Boolean active, @NotNull @PositiveOrZero Long expectedVersion) {}
    
    // Category
    record CategoryDto(Long id, Long projectId, @Size(max=32) String code, @Size(max=100) String name, boolean active, long version) {}
    record CreateCategory(@NotBlank @Size(max=32) String code, @NotBlank @Size(max=100) String name) {}
    record UpdateCategory(@Pattern(regexp="(?s).*\\S.*") @Size(max=100) String name, Boolean active, @NotNull @PositiveOrZero Long expectedVersion) {}
    
    // Milestone
    record MilestoneDto(Long id, Long projectId, @Size(max=32) String code, @Size(max=100) String name, LocalDate startsOn, LocalDate dueOn, boolean archived, long version) {}
    record CreateMilestone(@NotBlank @Size(max=32) String code, @NotBlank @Size(max=100) String name, LocalDate startsOn, LocalDate dueOn) {}
    record UpdateMilestone(@Pattern(regexp="(?s).*\\S.*") @Size(max=100) String name, LocalDate startsOn, LocalDate dueOn, Boolean archived, @NotNull @PositiveOrZero Long expectedVersion, @Size(max=2) java.util.List<@Pattern(regexp="startsOn|dueOn") String> clearDates) {}
}
