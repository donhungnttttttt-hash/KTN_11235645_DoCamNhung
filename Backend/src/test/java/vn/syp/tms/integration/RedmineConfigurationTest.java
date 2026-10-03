package vn.syp.tms.integration;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

class RedmineConfigurationTest {
    @TempDir Path temp;
    @Test void disabledConfigurationNeedsNoCredentials(){assertThat(new RedmineConfiguration(false,"","","",new ObjectMapper()).configured(1)).isFalse();}
    @Test void onlyHttpsOrLoopbackHttpWithoutUrlSecretsAreAccepted() {
        for(String url:new String[]{"http://remote.example","https://user:secret@example.com","https://example.com?token=secret","https://example.com/#key","file:///etc/passwd","not a url"})
            assertThatThrownBy(()->RedmineConfiguration.validateBase(url)).isInstanceOf(IllegalArgumentException.class);
        assertThat(RedmineConfiguration.validateBase("https://tracker.example/redmine/").toString()).isEqualTo("https://tracker.example/redmine");
        assertThat(RedmineConfiguration.validateBase("http://127.0.0.1:3080").getPort()).isEqualTo(3080);
    }
    @Test void invalidSecretsAndMappingFilesFailClosedWithoutValues() throws Exception {
        Path file=temp.resolve("mapping.json");Files.writeString(file,"x".repeat(65537));
        for(String key:new String[]{"","secret\nheader","valid-test-key"})
            assertThatThrownBy(()->new RedmineConfiguration(true,"http://127.0.0.1:3080",key,file.toString(),new ObjectMapper())).hasMessageNotContaining("valid-test-key").isInstanceOf(IllegalStateException.class);
        Files.writeString(file,"{\"1\":{\"externalProjectId\":1}}");
        assertThatThrownBy(()->new RedmineConfiguration(true,"http://127.0.0.1:3080","test",file.toString(),new ObjectMapper())).isInstanceOf(IllegalStateException.class);
    }
    @Test void absentMappingIsReportedAsUnconfiguredRatherThanInvented() {
        var config=new RedmineConfiguration(true,"http://127.0.0.1:3080","test","",new ObjectMapper());
        assertThat(config.configured(1)).isFalse();assertThatThrownBy(()->config.mapping(1)).hasMessageContaining("chưa được cấu hình");
    }
    @Test void validMappingLoadsWithoutExposingCredentials() throws Exception {
        var mapper=new ObjectMapper();var m=new RedmineClientTest().mapping;Path file=temp.resolve("valid.json");
        Files.writeString(file,mapper.writeValueAsString(java.util.Map.of("1",m)));
        var config=new RedmineConfiguration(true,"https://tracker.example/redmine/","hidden-test-token",file.toString(),mapper);
        assertThat(config.configured(1)).isTrue();assertThat(config.configured(2)).isFalse();assertThat(config.mapping(1)).isEqualTo(m);
        assertThat(config.instanceHash()).hasSize(64);assertThat(config.issueUrl(42)).isEqualTo("https://tracker.example/redmine/issues/42");
        assertThat(mapper.writeValueAsString(config.mapping(1))).doesNotContain("hidden-test-token");
        Files.writeString(file,mapper.writeValueAsString(java.util.Map.of("-1",m)));
        assertThatThrownBy(()->new RedmineConfiguration(true,"https://tracker.example","hidden-test-token",file.toString(),mapper)).isInstanceOf(IllegalStateException.class);
    }
    @Test void incompleteAndInvalidMappingsCannotRouteWork() {
        var m=new RedmineClientTest().mapping;
        for(int position=0;position<3;position++) {
            final int index=position;
            assertThatThrownBy(()->new RedmineConfiguration.Mapping(index==0?0:1,index==1?0:2,index==2?0:3,m.statuses(),m.priorities())).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(()->new RedmineConfiguration.Mapping(1,2,3,java.util.Map.of(),m.priorities())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->new RedmineConfiguration.Mapping(1,2,3,m.statuses(),java.util.Map.of())).isInstanceOf(IllegalArgumentException.class);
        var states=new java.util.HashMap<>(m.statuses());states.put("open",0L);
        assertThatThrownBy(()->new RedmineConfiguration.Mapping(1,2,3,states,m.priorities())).isInstanceOf(IllegalArgumentException.class);
        var priorities=new java.util.HashMap<>(m.priorities());priorities.put("LOW",0L);
        assertThatThrownBy(()->new RedmineConfiguration.Mapping(1,2,3,m.statuses(),priorities)).isInstanceOf(IllegalArgumentException.class);
    }
}
