package vn.syp.tms.workitem;

import static org.assertj.core.api.Assertions.*;
import java.util.UUID;
import java.io.ByteArrayOutputStream;
import java.util.List;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mock.web.MockMultipartFile;
import vn.syp.tms.feature.*;
import vn.syp.tms.identity.*;
import vn.syp.tms.project.*;
import vn.syp.tms.testcase.TestDocumentService;
import vn.syp.tms.testcase.TestCaseWorkbook;

/** Real MySQL joins; rollback fixtures in an explicitly isolated test schema only. */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named="TMS_TEST_USERS_URL", matches="jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+")
class FeatureIssueContextNativeTest {
    @DynamicPropertySource static void database(DynamicPropertyRegistry r) {
        String url=System.getenv("TMS_TEST_USERS_URL");
        if(url==null||!url.matches("jdbc:mysql://(?:127\\.0\\.0\\.1|localhost):[0-9]+/tms_userstest_[a-f0-9]{12}\\?.+"))
            throw new IllegalStateException("Dedicated test schema required");
        r.add("TMS_DB_URL",()->url);
        r.add("TMS_DB_USER",()->System.getenv("TMS_TEST_USERS_USER"));
        r.add("TMS_DB_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        r.add("TMS_MIGRATION_USER",()->System.getenv("TMS_TEST_USERS_USER"));
        r.add("TMS_MIGRATION_PASSWORD",()->System.getenv("TMS_TEST_USERS_PASSWORD"));
        r.add("TMS_BOOTSTRAP_ENABLED",()->"false");r.add("TMS_REDMINE_ENABLED",()->"false");
        r.add("TMS_CHATGPT_LOCAL_ENABLED",()->"false");r.add("TMS_OLLAMA_ENABLED",()->"false");r.add("TMS_OPENAI_ENABLED",()->"false");
        r.add("spring.session.jdbc.cleanup-cron",()->"-");r.add("TMS_AI_DRAFT_CLEANUP_CRON",()->"-");r.add("TMS_AI_CHAT_CLEANUP_CRON",()->"-");
    }
    @Autowired IdentityUserRepository users;
    @Autowired ProjectService projects;
    @Autowired FeatureService features;
    @Autowired FeatureIssueService issues;
    @Autowired TestDocumentService documents;

    @Test void createFromCaseContextIncludesCurrentFeatureAndKeepsCaseFieldsSeparate() throws Exception {
        String tag=UUID.randomUUID().toString().substring(0,8);
        String actor=users.saveAndFlush(new IdentityUser("context.case."+tag,"Context admin","not-login","ADMIN")).getId();
        long p=projects.create(actor,new ProjectDtos.CreateProject("CXC"+tag,"Case context project","","UTC")).id();
        long f=((Number)features.create(p,actor,new FeatureDtos.Create("Case Feature","idec-test100","Feature description",UUID.randomUUID())).get("id")).longValue();
        byte[] bytes;
        try(var book=new XSSFWorkbook();var output=new ByteArrayOutputStream()) {
            var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);
            for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));
            var row=sheet.createRow(1);
            var values=List.of("TC1","UNREGISTERED-SUITE","Case title","","Case steps","Case expected","","","","","reference");
            for(int c=0;c<values.size();c++)row.createCell(c).setCellValue(values.get(c));
            book.write(output);bytes=output.toByteArray();
        }
        long d=((Number)features.preview(p,actor,f,new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).get("id")).longValue();
        features.commit(p,actor,f,d);
        long row=documents.get(p,actor,d).rows().getFirst().rowId();
        assertThat(issues.context(p,actor,f,d,row)).containsEntry("featureName","Case Feature")
                .containsEntry("featureEnvironment","idec-test100").containsEntry("featureDescription","Feature description")
                .containsEntry("title","Case title").containsEntry("steps","Case steps").containsEntry("expectedResult","Case expected");
        features.update(p,actor,f,new FeatureDtos.Update("Renamed Feature","new-server","New description",0L));
        assertThat(issues.context(p,actor,f,d,row)).containsEntry("featureName","Renamed Feature")
                .containsEntry("featureEnvironment","new-server").containsEntry("featureDescription","New description");
    }

    @ParameterizedTest @ValueSource(strings={"BUG","QA"})
    void existingIssueReadsCurrentFeatureWithoutRewritingIssueOrHistory(String type) {
        String tag=UUID.randomUUID().toString().substring(0,8);
        var admin=users.saveAndFlush(new IdentityUser("context.admin."+tag,"Context admin","not-login","ADMIN"));
        String actor=admin.getId();
        long p=projects.create(actor,new ProjectDtos.CreateProject("CTX"+tag,"Context project","","UTC")).id();
        var feature=features.create(p,actor,new FeatureDtos.Create("Original Feature","idec-test100","Original description",UUID.randomUUID()));
        long f=((Number)feature.get("id")).longValue();
        var issue=issues.create(p,actor,new FeatureIssueDtos.Create(type,f,null,null,type.equals("BUG"),"Issue","Issue description","Steps","Expected","Actual",UUID.randomUUID()));
        long id=((Number)issue.get("id")).longValue();
        assertThat(issue).containsEntry("featureEnvironment","idec-test100").containsEntry("featureDescription","Original description");
        var history=issues.history(p,actor,id);
        features.update(p,actor,f,new FeatureDtos.Update("Updated Feature","staging-200","New description\nSecond line",0L));
        var current=issues.get(p,actor,id);
        assertThat(current).containsEntry("featureName","Updated Feature").containsEntry("featureEnvironment","staging-200")
                .containsEntry("featureDescription","New description\nSecond line").containsEntry("description","Issue description")
                .containsEntry("version",issue.get("version")).containsEntry("updatedAt",issue.get("updatedAt"));
        assertThat(issues.history(p,actor,id)).isEqualTo(history);
        features.update(p,actor,f,new FeatureDtos.Update("Updated Feature","","",1L));
        assertThat(issues.get(p,actor,id)).containsEntry("featureEnvironment","").containsEntry("featureDescription","");
        long other=projects.create(actor,new ProjectDtos.CreateProject("CXB"+tag,"Other project","","UTC")).id();
        assertThatThrownBy(()->issues.get(other,actor,id)).isInstanceOf(vn.syp.tms.shared.web.BusinessException.class);
    }
}
