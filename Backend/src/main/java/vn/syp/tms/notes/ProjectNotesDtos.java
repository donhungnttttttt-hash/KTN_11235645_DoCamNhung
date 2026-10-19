package vn.syp.tms.notes;

import jakarta.validation.constraints.*;
import java.util.List;

public final class ProjectNotesDtos {
    private ProjectNotesDtos() {}
    public record Create(@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String body) {}
    public record Update(@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String body,
            @NotNull @Min(0) Long expectedVersion) {}
    public record Page(List<ProjectNote> items,long totalItems,int page,int size,long totalPages) {}
}
