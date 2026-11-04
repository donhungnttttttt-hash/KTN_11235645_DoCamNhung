package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class LegacyArchiveSnapshotTest {
    private Map<String,Object> cycle(long id,String status,long version,Long run) {
        var row=new HashMap<String,Object>();row.put("id",id);row.put("status",status);row.put("version",version);row.put("runId",run);return row;
    }
    @Test void snapshotIsStableAcrossRowOrder() {
        var rows=List.of(cycle(9,"ACTIVE",2,8L),cycle(3,"DRAFT",0,4L),cycle(9,"ACTIVE",2,7L),cycle(9,"ACTIVE",2,8L));
        var reversed=new ArrayList<>(rows);Collections.reverse(reversed);
        var a=new LegacyArchiveSnapshot(1,5,rows,List.of(Map.of("id",8L,"status","OPEN","version",2L)));
        var b=new LegacyArchiveSnapshot(1,5,reversed,List.of(Map.of("id",8L,"status","OPEN","version",2L)));
        assertThat(a.canonicalJson()).isEqualTo("{\"policyVersion\":1,\"projectId\":1,\"projectVersion\":5,\"cycles\":[{\"id\":3,\"status\":\"DRAFT\",\"version\":0,\"runIds\":[4]},{\"id\":9,\"status\":\"ACTIVE\",\"version\":2,\"runIds\":[7,8]}],\"retests\":[{\"id\":8,\"status\":\"OPEN\",\"version\":2}]}");
        assertThat(a.fingerprint()).isEqualTo(b.fingerprint());assertThat(a.cycleCount()).isEqualTo(2);
    }
    @Test void sameCountDifferentIdsChangesFingerprint() {
        var a=new LegacyArchiveSnapshot(1,0,List.of(cycle(1,"ACTIVE",0,null)),List.of());
        for(var row:List.of(cycle(2,"ACTIVE",0,null),cycle(1,"DRAFT",0,1L),cycle(1,"ACTIVE",1,null),cycle(1,"ACTIVE",0,1L)))
            assertThat(new LegacyArchiveSnapshot(1,0,List.of(row),List.of()).fingerprint()).isNotEqualTo(a.fingerprint());
        var row=cycle(1,"ACTIVE",0,null);row.put("label","Translated");row.put("asOf","later");
        assertThat(new LegacyArchiveSnapshot(1,0,List.of(row),List.of()).fingerprint()).isEqualTo(a.fingerprint());
        assertThat(new LegacyArchiveSnapshot(1,1,List.of(row),List.of()).fingerprint()).isNotEqualTo(a.fingerprint());
    }
    @Test void retestIdentityAndVersionAreCanonicalAndPersistedSummaryIsSafe() {
        var one=Map.<String,Object>of("id",7L,"status","OPEN","version",0L);var two=Map.<String,Object>of("id",2L,"status","OPEN","version",3L);
        var a=new LegacyArchiveSnapshot(1,0,List.of(),List.of(one,two));var b=new LegacyArchiveSnapshot(1,0,List.of(),List.of(two,one));
        assertThat(a.fingerprint()).isEqualTo(b.fingerprint());assertThat(a.retestCount()).isEqualTo(2);
        for(var change:List.of(Map.<String,Object>of("id",8L,"status","OPEN","version",0L),Map.<String,Object>of("id",7L,"status","OPEN","version",1L),Map.<String,Object>of("id",7L,"status","CANCELLED","version",0L)))
            assertThat(new LegacyArchiveSnapshot(1,0,List.of(),List.of(change,two)).fingerprint()).isNotEqualTo(a.fingerprint());
        assertThat(LegacyArchiveSnapshot.summary(a.persistedJson())).containsOnlyKeys("policyVersion","fingerprint","blockers").containsEntry("fingerprint",a.fingerprint());
        assertThat(LegacyArchiveSnapshot.summary(null)).isNull();
    }
}
