package vn.syp.tms.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public interface ProjectDtos {
    record ProjectSummary(Long id, String code, String name, String description, String timezone, boolean archived, long version, String projectRole) {}
    
    record ProjectDetail(Long id, String code, String name, String description, String timezone, boolean archived, long version, long membersCount, Instant createdAt, String createdBy, Instant updatedAt, String updatedBy) {}
    
    record CreateProject(
        @NotBlank @Size(max=32) @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9_-]{1,31}") String code,
        @NotBlank @Size(max=100) String name,
        @Size(max=500) String description,
        @Size(max=50) String timezone
    ) {}
    
    record UpdateProject(
        @Pattern(regexp="(?s).*\\S.*") @Size(max=100) String name,
        @Size(max=500) String description,
        @Size(max=50) String timezone,
        @NotNull Long expectedVersion
    ) {}
    
    record MemberInfo(
        Long membershipId,
        String userId,
        String username,
        String displayName,
        String systemRole,
        String projectRole,
        boolean active,
        long version
    ) {}
    
    record SetMember(
        @NotBlank @Pattern(regexp="PM|TESTER|MEMBER") String projectRole,
        @jakarta.validation.constraints.PositiveOrZero Long expectedVersion
    ) { public SetMember(String projectRole) { this(projectRole,null); } }
    record MemberCandidate(String userId,String username,String displayName,Long membershipVersion) {}
}
