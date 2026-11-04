package vn.syp.tms.admin;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.syp.tms.workitem.WorkItemStore;
import vn.syp.tms.shared.web.BusinessException;

class ProjectArchiveLegacyExceptionTest {
    final WorkItemStore db=new WorkItemStore(null,new ObjectMapper());
    @Test void normalDigestRemainsByteCompatible() {
        var command=new ProjectLifecycleService.Command(7L,"  Accepted  ","ordinary-key");
        assertThat(ProjectLifecycleService.commandDigest(db,"ARCHIVE",command)).isEqualTo(db.checksum(List.of("ARCHIVE",7L,"Accepted")));
        assertThat(command.legacyException()).isNull();
    }
    @Test void exceptionPayloadValidationAndDigest() {
        String fp="a".repeat(64);
        var command=new ProjectLifecycleService.Command(7L," Accepted ","exception-key",new ProjectLifecycleService.LegacyException(true,fp));
        ProjectLifecycleService.validateCommand(command,true);
        assertThat(ProjectLifecycleService.commandDigest(db,"ARCHIVE",command)).isEqualTo(db.checksum(List.of("PROJECT_LIFECYCLE_LEGACY_EXCEPTION_V1","ARCHIVE",7L,"Accepted",true,fp)));
        assertThat(ProjectLifecycleService.commandDigest(db,"ARCHIVE",command)).isNotEqualTo(db.checksum(List.of("ARCHIVE",7L,"Accepted")));
        for(var value:List.of(new ProjectLifecycleService.LegacyException(false,fp),new ProjectLifecycleService.LegacyException(null,fp),new ProjectLifecycleService.LegacyException(true,null),new ProjectLifecycleService.LegacyException(true,fp.toUpperCase()),new ProjectLifecycleService.LegacyException(true,"short")))
            invalid(new ProjectLifecycleService.Command(7L,"Accepted","exception-key",value),true);
        invalid(command,false);invalid(null,true);invalid(new ProjectLifecycleService.Command(0L," ","ordinary-key"),true);
        invalid(new ProjectLifecycleService.Command(null,"Reason","ordinary-key"),true);invalid(new ProjectLifecycleService.Command(-1L,"Reason","ordinary-key"),true);
        invalid(new ProjectLifecycleService.Command(0L,"Reason","short"),true);invalid(new ProjectLifecycleService.Command(0L,"x".repeat(2001),"ordinary-key"),true);
        ProjectLifecycleService.validateCommand(new ProjectLifecycleService.Command(0L," "+"x".repeat(2000)+" ","ordinary-key"),true);
    }
    private void invalid(ProjectLifecycleService.Command command,boolean archive) {
        assertThatThrownBy(()->ProjectLifecycleService.validateCommand(command,archive)).isInstanceOfSatisfying(BusinessException.class,e->{assertThat(e.status()).isEqualTo(422);assertThat(e.code()).isEqualTo("INVALID_COMMAND");});
    }
}
