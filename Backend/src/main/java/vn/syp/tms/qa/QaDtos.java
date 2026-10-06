package vn.syp.tms.qa;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface QaDtos {
    record Create(@NotBlank @Size(max=300) String title, @NotBlank @Size(max=20000) String question,
                  @Pattern(regexp="HIGH|MEDIUM|LOW") String priority, @Positive Long categoryId,
                  @Positive Long milestoneId, @Positive Long documentId, @Positive Long groupId,
                  @Positive Long runItemId, @Positive Long revisionId,
                  @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Assign(@NotNull @Positive Long assigneeMembershipId, @NotBlank @Size(max=1000) String reason,
                  @NotNull @PositiveOrZero Long expectedVersion,
                  @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Command(@NotBlank @Size(max=1000) String reason, @NotNull @PositiveOrZero Long expectedVersion,
                   @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record ProvideInfo(@NotBlank @Size(max=20000) String body, @NotNull @PositiveOrZero Long expectedVersion,
                       @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Answer(@NotBlank @Size(max=20000) String body, @Size(max=1000) String basisReference,
                  @NotNull @PositiveOrZero Long expectedVersion,
                  @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Confirm(@NotNull @Positive Long answerId, @NotNull @Positive Long answerVersion,
                   @NotBlank @Size(max=20000) String body, @NotNull @PositiveOrZero Long expectedVersion,
                   @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Close(@NotBlank @Size(max=1000) String reason, boolean exception,
                 @NotNull @PositiveOrZero Long expectedVersion,
                 @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{8,64}") String requestKey) {}
    record Filter(int page, int size, boolean mine, String status, String keyword) {}
    record Page<T>(List<T> items, long totalItems, int page, int size, long totalPages) {}
    record Capabilities(boolean canAssign, boolean canStart, boolean canRequestInfo, boolean canProvideInfo,
                        boolean canAnswer, boolean canConfirm, boolean canClose, boolean canCloseException,
                        boolean canReopen, boolean canComment, boolean canUploadEvidence) {}
    record QaSummary(long id, long projectId, long itemNo, String key, String type, String title,
                     String question, String status, String statusLabel, String priority, Long categoryId,
                     Long milestoneId, Long assigneeMembershipId, String assigneeName, long createdBy,
                     String creatorName, Instant createdAt, Instant updatedAt, long version, long generation,
                     Long documentId, Long groupId, Long runItemId, Long testCaseId, Long revisionId,
                     Long currentAnswerId, Long currentAnswerVersion, Long currentConfirmationId,
                     Capabilities capabilities) {}
    record QaDetail(QaSummary item, Map<String,Object> contextSnapshot, QaAnswer currentAnswer,
                    QaConfirmation currentConfirmation) {}
    record QaAnswer(long id, long workItemId, long generation, long answerVersion, String body,
                    String basisReference, long authorMembershipId, String authorName, Instant answeredAt) {}
    record QaConfirmation(long id, long workItemId, long generation, long answerId, long answerVersion,
                          String body, long confirmedBy, String confirmerName, Instant confirmedAt) {}
}
