package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.syp.tms.identity.*;
import vn.syp.tms.shared.web.BusinessException;
import vn.syp.tms.workitem.WorkItemStore;

class AdminOverviewServiceTest {
    @Test void inventoryCountsPhysicalStateAndUnreturnedOverdueFromRealRows() {
        var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);var service=new AdminOverviewService(db,identity);
        when(identity.current("actor")).thenReturn(new IdentityUser("admin","Admin","SECRET","ADMIN"));
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(c->{String sql=c.getArgument(0);
            if(sql.contains("GROUP BY a.type,status")){assertThat(sql).contains("active_asset_id","l.project_id=?");return List.of(Map.of("type","IPAD","status","ALLOCATED","total",3L),Map.of("type","IPAD","status","MAINTENANCE","total",2L));}
            if(sql.contains("l.expected_return_on AS expectedReturnOn")){assertThat(sql).contains("l.returned_at IS NULL","p.id=?");return List.of(Map.of("id",1L,"timezone","Pacific/Kiritimati","expectedReturnOn",java.sql.Date.valueOf("2000-01-01")),Map.of("id",2L,"timezone","UTC","expectedReturnOn",java.sql.Date.valueOf("2999-01-01")));}
            return List.of();});
        var result=service.overview("actor",7L);
        assertThat(result.inventory()).containsEntry("allocated",3L).containsEntry("maintenance",2L).containsEntry("available",0L).containsEntry("overdueReturnCount",1);
        assertThat(result.attention()).containsEntry("overdueReturnCount",1);
    }
    @Test void plannedDraftCycleIsUnfinishedScheduleScopeAndMissingDueOrScopeIsUnknown() {
        var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);var service=new AdminOverviewService(db,identity);
        when(identity.current("actor")).thenReturn(new IdentityUser("admin","Admin","SECRET","ADMIN"));
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{String sql=call.getArgument(0);
            if(!sql.contains("FROM milestones ms"))return List.of();
            assertThat(sql).contains("c.status_code<>'CLOSED'").doesNotContain("c.status_code<>'DRAFT'");
            var overdue=new LinkedHashMap<String,Object>(Map.of("id",1L,"projectId",1L,"timezone","Pacific/Kiritimati","dueOn",java.sql.Date.valueOf("2000-01-01"),"scopeCount",1L,"unfinished",true));
            var missing=new LinkedHashMap<String,Object>(overdue);missing.put("id",2L);missing.put("dueOn",null);
            var noScope=new LinkedHashMap<String,Object>(overdue);noScope.put("id",3L);noScope.put("scopeCount",0L);
            return List.of(overdue,missing,noScope);});
        var result=service.overview("actor",null);
        assertThat(result.attention()).containsEntry("overdueMilestoneCount",1).containsEntry("insufficientMilestoneData",2L);
    }
    private Map<String,Object> project(long id,long total,long na,long ok,long ng,long pending) {
        var p=new LinkedHashMap<String,Object>();p.put("id",id);p.put("code","P"+id);p.put("name","Project "+id);p.put("activePmCount",0L);p.put("archivedAt",null);
        p.put("total",total);p.put("na",na);p.put("ok",ok);p.put("ng",ng);p.put("pending",pending);p.put("openBugs",1L);p.put("awaitingVerification",1L);return p;
    }
    @Test void aggregatesRunCountsBeforeDividingAndKeepsNaPendingAndDistinctRoleCounts() {
        var db=mock(WorkItemStore.class);var identity=mock(IdentityService.class);var service=new AdminOverviewService(db,identity);
        when(identity.current("actor")).thenReturn(new IdentityUser("admin","Admin","SECRET","ADMIN"));
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenAnswer(call->{String sql=call.getArgument(0);
            if(sql.contains("COALESCE(m.members")) return new ArrayList<>(List.of(project(1,10,2,2,2,3),project(2,2,0,2,0,0)));
            if(sql.contains("u.role_code AS role")) return List.of(Map.of("role","TESTER","total",3L,"enabled",2L));
            return List.of();});
        var all=service.overview("actor",null);
        assertThat(all.metrics()).containsEntry("executionPercent",60.0).containsEntry("passPercent",40.0).containsEntry("na",2L).containsEntry("pending",3L).containsEntry("notRun",1L);
        assertThat(all.totalUsers()).isEqualTo(3);assertThat(all.enabledUsers()).isEqualTo(2);
        assertThat(all.openBugs()).isEqualTo(2);assertThat(all.awaitingVerification()).isEqualTo(2);
        verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
    }
    @Test void currentEnabledAdminCanReadWithoutMembershipAndRevokedRoleCannot() {
        var db=mock(WorkItemStore.class); var identity=mock(IdentityService.class);
        var service=new AdminOverviewService(db,identity);
        when(identity.current("actor")).thenReturn(new IdentityUser("other.admin","Admin","SECRET","ADMIN"));
        when(db.rows(java.util.Objects.requireNonNull(anyString()),any(Object[].class))).thenReturn(List.of());
        var result=service.overview("actor",null);
        assertThat(result.metrics().get("executionPercent")).isNull();
        assertThat(result.totalProjects()).isZero();
        verify(db,never()).update(java.util.Objects.requireNonNull(anyString()),any(Object[].class));
        when(identity.current("actor")).thenReturn(new IdentityUser("same","PM","SECRET","PM"));
        assertThatThrownBy(()->service.overview("actor",null)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(403));
    }
    @Test void unauthorizedAndInvalidFiltersFailBeforeQueries() {
        var db=mock(WorkItemStore.class); var identity=mock(IdentityService.class);
        var service=new AdminOverviewService(db,identity);
        when(identity.current("actor")).thenThrow(new BusinessException(401,"UNAUTHENTICATED","Expired"));
        assertThatThrownBy(()->service.projects("actor",null,"",0,20)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(401));
        verifyNoInteractions(db);
        doReturn(new IdentityUser("admin","Admin","SECRET","ADMIN")).when(identity).current("actor");
        assertThatThrownBy(()->service.projects("actor",null,"",-1,20)).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(422));
        verifyNoInteractions(db);
    }
}
