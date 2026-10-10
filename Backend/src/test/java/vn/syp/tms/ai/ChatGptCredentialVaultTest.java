package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ChatGptCredentialVaultTest {
    @TempDir Path directory;
    @Test void ownerOnlyEncryptedAtomicStorageSurvivesRestartAndRejectsTampering()throws Exception {
        byte[] key=new byte[32];new SecureRandom().nextBytes(key);var json=new ObjectMapper();var config=config(Base64.getEncoder().encodeToString(key));
        try(varClose first=new varClose(new ChatGptCredentialVault(config,json))) {
            first.vault.write(json.createObjectNode().put("accessToken","secret-access").put("version",7));
            assertThat(new String(Files.readAllBytes(directory.resolve("chatgpt.enc")),java.nio.charset.StandardCharsets.UTF_8)).doesNotContain("secret-access");
            assertThat(first.vault.read().path("version").asLong()).isEqualTo(7);ChatGptCredentialVault.check(directory.resolve("chatgpt.enc"));
            assertThatThrownBy(()->new ChatGptCredentialVault(config,json)).isInstanceOf(IllegalArgumentException.class);
        }
        try(varClose second=new varClose(new ChatGptCredentialVault(config,json))) {
            assertThat(second.vault.read().path("accessToken").asText()).isEqualTo("secret-access");byte[] bytes=Files.readAllBytes(directory.resolve("chatgpt.enc"));bytes[bytes.length-1]^=1;Files.write(directory.resolve("chatgpt.enc"),bytes);
            assertThatThrownBy(second.vault::read).hasMessage("AI_CREDENTIAL_STORE_FAILED");
        }
    }
    @Test void missingEncryptionKeyFailsClosed(){assertThatThrownBy(()->new ChatGptCredentialVault(config(""),new ObjectMapper())).isInstanceOf(IllegalArgumentException.class);}
    LocalAiConfiguration config(String key){return new LocalAiConfiguration(true,"owner","urn:uuid:12345678-1234-1234-1234-123456789012",directory.toString(),key,"127.0.0.1",false,"http://127.0.0.1:11434");}
    record varClose(ChatGptCredentialVault vault) implements AutoCloseable{public void close(){vault.close();}}
}
