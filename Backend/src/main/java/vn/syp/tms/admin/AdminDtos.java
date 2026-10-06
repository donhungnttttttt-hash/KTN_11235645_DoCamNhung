package vn.syp.tms.admin;

import java.time.Instant;
import java.util.*;

/** Explicit public read models; never serialize identity/session entities. */
public final class AdminDtos {
    private AdminDtos() {}
    public record Page<T>(List<T> items,int page,int size,long totalElements) {}
    public record Overview(Instant asOf,String metricDefinitionVersion,Long projectId,long totalProjects,long activeProjects,
            long totalUsers,long enabledUsers,long openBugs,long awaitingVerification,Map<String,Object> metrics,
            List<Map<String,Object>> byRole,List<Map<String,Object>> byProject,Map<String,Object> attention,
            Map<String,Object> inventory) {}
}
