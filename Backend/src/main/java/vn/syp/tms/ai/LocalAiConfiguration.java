package vn.syp.tms.ai;

import java.net.URI;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Explicit local installation settings. Never contains browser-controlled endpoints. */
@Component
public class LocalAiConfiguration {
    final boolean chatgptEnabled;
    final boolean ollamaEnabled;
    final String owner;
    final String hostId;
    final Path vaultPath;
    final String vaultKey;
    final URI ollama;
    public LocalAiConfiguration(@Value("${TMS_CHATGPT_LOCAL_ENABLED:false}") boolean chatgpt,
            @Value("${TMS_CHATGPT_OWNER_ID:}") String owner,
            @Value("${TMS_CHATGPT_HOST_ID:}") String hostId,
            @Value("${TMS_CHATGPT_VAULT_PATH:}") String vaultPath,
            @Value("${TMS_CHATGPT_VAULT_KEY:}") String vaultKey,
            @Value("${server.address:}") String bind,
            @Value("${TMS_OLLAMA_ENABLED:false}") boolean ollamaEnabled,
            @Value("${TMS_OLLAMA_URL:http://127.0.0.1:11434}") String ollamaUrl) {
        this.chatgptEnabled=chatgpt;this.owner=owner;this.hostId=hostId;this.vaultKey=vaultKey;
        this.vaultPath=vaultPath.isBlank()?null:Path.of(vaultPath);
        this.ollamaEnabled=ollamaEnabled;this.ollama=ollamaUri(ollamaUrl);
        if(chatgpt && (!"127.0.0.1".equals(bind) || owner.isBlank() || owner.length()>100
                || !hostId.matches("urn:uuid:[0-9a-fA-F-]{36}") || this.vaultPath==null || !this.vaultPath.isAbsolute()))
            throw new IllegalArgumentException("ChatGPT requires explicit loopback binding, local owner, stable host ID and absolute protected vault path.");
    }
    static URI ollamaUri(String value) {
        URI uri=URI.create(value);
        if(!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()) || uri.getPort()<1
                || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))
            throw new IllegalArgumentException("Ollama must use an explicit 127.0.0.1 HTTP port with no path or credentials.");
        return URI.create("http://127.0.0.1:"+uri.getPort());
    }
}
