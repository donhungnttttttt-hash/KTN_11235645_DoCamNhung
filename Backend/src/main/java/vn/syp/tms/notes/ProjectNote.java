package vn.syp.tms.notes;

import java.time.Instant;

public record ProjectNote(long id,long projectId,String title,String body,long version,
        String createdBy,String updatedBy,Instant createdAt,Instant updatedAt) {}
