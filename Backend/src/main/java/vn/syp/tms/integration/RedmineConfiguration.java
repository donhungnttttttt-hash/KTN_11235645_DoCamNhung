package vn.syp.tms.integration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.syp.tms.shared.web.BusinessException;

/** Operator-owned endpoint and mapping. Secrets never enter a DTO or a record's toString. */
@Component
public class RedmineConfiguration {
    public record Mapping(long externalProjectId,long trackerId,long correlationFieldId,
                          Map<String,Long> statuses,Map<String,Long> priorities) {
        public Mapping {
            statuses=Map.copyOf(statuses);priorities=Map.copyOf(priorities);
            if(externalProjectId<1 || trackerId<1 || correlationFieldId<1
                || !statuses.keySet().equals(Set.of("open","progress","recheck","clarify","ready","planning","resolved","unreproducible","wontfix","closed"))
                || !priorities.keySet().equals(Set.of("HIGH","MEDIUM","LOW"))
                || statuses.values().stream().anyMatch(v->v<1) || priorities.values().stream().anyMatch(v->v<1))
                throw new IllegalArgumentException("Invalid Redmine mapping");
        }
    }
    private final boolean enabled;
    private final URI base;
    private final String apiKey;
    private final Map<Long,Mapping> mappings;
    public RedmineConfiguration(@Value("${TMS_REDMINE_ENABLED:false}") boolean enabled,
                                @Value("${TMS_REDMINE_BASE_URL:}") String url,
                                @Value("${TMS_REDMINE_API_KEY:}") String apiKey,
                                @Value("${TMS_REDMINE_MAPPING_FILE:}") String file,ObjectMapper json) {
        this.enabled=enabled;this.apiKey=apiKey;
        if(!enabled){base=null;mappings=Map.of();return;}
        try {
            base=validateBase(url);
            if(apiKey.isBlank() || apiKey.contains("\r") || apiKey.contains("\n"))throw new IllegalArgumentException();
            if(file.isBlank()){mappings=Map.of();return;}
            if(Files.size(Path.of(file))>65536)throw new IllegalArgumentException();
            mappings=Map.copyOf(json.readValue(Files.readString(Path.of(file)),new TypeReference<Map<Long,Mapping>>(){}));
            if(mappings.keySet().stream().anyMatch(id->id<1))throw new IllegalArgumentException();
        } catch(Exception e) {throw new IllegalStateException("Invalid operator Redmine configuration; check endpoint, credentials and mapping file locally.");}
    }
    static URI validateBase(String url) {
        URI uri=URI.create(url.endsWith("/")?url.substring(0,url.length()-1):url);
        boolean local="127.0.0.1".equals(uri.getHost()) || "localhost".equals(uri.getHost()) || "[::1]".equals(uri.getHost());
        if(uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
            || !("https".equals(uri.getScheme()) || local && "http".equals(uri.getScheme())))throw new IllegalArgumentException("Invalid Redmine endpoint");
        return uri;
    }
    public boolean configured(long projectId) {return enabled && mappings.containsKey(projectId);}
    public Mapping mapping(long projectId) {
        if(!configured(projectId))throw new BusinessException(409,"REDMINE_NOT_CONFIGURED","Dự án chưa được cấu hình liên kết Redmine.");
        return mappings.get(projectId);
    }
    public URI base() {return base;}
    String apiKey() {return apiKey;}
    public String instanceHash() {return digest(base.toString());}
    public String issueUrl(long id) {return base+"/issues/"+id;}
    static String digest(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
