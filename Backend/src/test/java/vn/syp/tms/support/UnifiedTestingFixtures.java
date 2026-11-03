package vn.syp.tms.support;

import java.util.*;
import java.io.ByteArrayOutputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import vn.syp.tms.feature.*;
import vn.syp.tms.project.*;
import vn.syp.tms.testcase.*;
import vn.syp.tms.identity.IdentityUser;

public abstract class UnifiedTestingFixtures extends UnifiedAccessFixtures {
    @Autowired protected FeatureService features;
    @Autowired protected TestDocumentService documents;
    protected long p,f,d,row,member;
    protected IdentityUser worker;
    protected void testingFixture()throws Exception {
        p=projects.create(admin.getId(),new ProjectDtos.CreateProject("UT"+UUID.randomUUID().toString().substring(0,8),"Testing project","","UTC")).id();
        f=((Number)features.create(p,admin.getId(),new FeatureDtos.Create("Feature","Current server","Current description",UUID.randomUUID())).get("id")).longValue();
        worker=account("USER");member=projects.addOrUpdateMember(p,admin.getId(),worker.getId(),new ProjectDtos.SetMember("USER")).membershipId();
        byte[] bytes;try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var sheet=book.createSheet("TestCases");var header=sheet.createRow(0);
            for(int c=0;c<11;c++)header.createCell(c).setCellValue(TestCaseWorkbook.HEADERS.get(c));
            for(int n=1;n<=2;n++){var record=sheet.createRow(n);var values=List.of("TC"+n,"UNREGISTERED-SUITE","Case title","","Case steps","Case expected","","","","","reference");for(int c=0;c<values.size();c++)record.createCell(c).setCellValue(values.get(c));}
            book.write(out);bytes=out.toByteArray();
        }
        d=((Number)features.preview(p,admin.getId(),f,new MockMultipartFile("file","cases.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",bytes)).get("id")).longValue();
        features.commit(p,admin.getId(),f,d);row=Objects.requireNonNull(documents.get(p,admin.getId(),d).rows().getFirst().rowId());
    }
    protected long documentVersion(){return ((Number)features.assignments(p,admin.getId(),d).get("version")).longValue();}
    protected void assignWorker(){features.assign(p,admin.getId(),d,new FeatureDtos.Assignments(documentVersion(),UUID.randomUUID(),List.of(new FeatureDtos.Scope(member,List.of(row)))));}
}
