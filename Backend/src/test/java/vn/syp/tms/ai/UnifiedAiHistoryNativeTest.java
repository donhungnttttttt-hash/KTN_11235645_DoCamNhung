package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import vn.syp.tms.support.UnifiedTestingFixtures;
import vn.syp.tms.workitem.WorkItemStore;

/** Post-V37 fixture with the exact pre-migration fingerprint, through real HTTP sessions. */
class UnifiedAiHistoryNativeTest extends UnifiedTestingFixtures {
 @Autowired WorkItemStore db;
 @Test void oldPortfolioAndProjectThreadsAreReadableButRevocationStillHidesThem()throws Exception{
  testingFixture();
  jdbc.update("UPDATE project_memberships SET lock_version=1 WHERE id=?",member);
  jdbc.update("INSERT INTO identity_role_migration_journal(entity_type,entity_id,previous_role,next_role,previous_version) VALUES('ACCOUNT',?,'TESTER','USER',0),('MEMBERSHIP',?,'TESTER','USER',0)",worker.getId(),Long.toString(member));
  var grants=List.of(List.of(p,"TESTER",member,0L));
  String portfolio="portfolio-v1:"+db.checksum(List.of("TESTER",grants));
  String project="project-chat-v1:"+db.checksum(List.of("TESTER",grants,p));
  long a=thread(null,AiPortfolioContext.PURPOSE,portfolio),b=thread(p,AiPortfolioContext.PROJECT_PURPOSE,project);
  var user=loggedIn(worker);
  var list=user.get("/ai/chats");assertThat(list.statusCode()).isEqualTo(200);
  assertThat(body(list).path("items").size()).isEqualTo(2);
  assertThat(user.get("/ai/chats/"+a).statusCode()).isEqualTo(200);
  assertThat(user.get("/ai/chats/"+b).statusCode()).isEqualTo(200);
  jdbc.update("UPDATE project_memberships SET active=FALSE,lock_version=2 WHERE id=?",member);
  assertThat(user.get("/ai/chats/"+b).statusCode()).isEqualTo(404);
  assertThat(body(user.get("/ai/chats")).path("items").size()).isZero();
  jdbc.update("UPDATE project_memberships SET active=TRUE,lock_version=3 WHERE id=?",member);
  assertThat(user.get("/ai/chats/"+a).statusCode()).isEqualTo(404);
 }
 private long thread(Long project,String purpose,String reference){return db.insert("INSERT INTO ai_chat_threads(created_by,project_id,purpose,source_reference,provider,model,created_at,expires_at) VALUES(?,?,?,?,'OPENAI_API','fixture-only',UTC_TIMESTAMP(6),TIMESTAMPADD(DAY,7,UTC_TIMESTAMP(6)))",worker.getId(),project,purpose,reference);}
}
