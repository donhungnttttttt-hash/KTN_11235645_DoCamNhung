package vn.syp.tms.handbook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public interface HandbookDtos {
    record RevisionDto(Long id, Integer revisionNo, String contentHtml, String visibility, Long editedBy, Instant publishedAt, Instant createdAt) {}
    record ResourceDto(Long id, String code, String resourceType, String name, RevisionDto currentRevision, boolean archived) {}
    record ResourceDetailDto(Long id, String code, String resourceType, String name, RevisionDto currentRevision, boolean archived, List<RevisionDto> history) {}
    
    record CreateResource(@NotBlank @Size(max=32) String code, @NotBlank @Pattern(regexp="GUIDE|SPEC_REFERENCE|TEST_ACCOUNT_REFERENCE") String resourceType, @NotBlank @Size(max=100) String name, @NotBlank @Size(max=10000) String contentHtml, @Pattern(regexp="INTERNAL") String visibility) {}
    record CreateRevision(@NotBlank @Size(max=10000) String contentHtml, @Pattern(regexp="INTERNAL") String visibility, @NotNull @Positive Long expectedCurrentRevisionId) {}
}
