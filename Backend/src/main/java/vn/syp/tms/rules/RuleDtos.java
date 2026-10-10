package vn.syp.tms.rules;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;

public interface RuleDtos {
    record RuleVersionDto(Long id, Integer versionNo, String contentJson, Instant publishedAt, Long publishedBy, Instant createdAt, Long createdBy) {}
    record RulesetDto(Long id, String code, String name, boolean active, RuleVersionDto activeVersion) {}
    
    record CreateRuleset(@NotBlank @Size(max=32) String code, @NotBlank @Size(max=100) String name) {}
    record CreateRuleVersion(@NotBlank @Size(max=4000) String contentJson) {}
    record Publish(@NotNull @PositiveOrZero Long expectedActiveVersionId) {}
}
