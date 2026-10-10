package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class ChatGptOAuthClient {
    static final String RESOURCE="https://api.openai.com/v1";
    static final String SCOPES="openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
    private final ProviderHttp http;
    private final URI issuer;
    @org.springframework.beans.factory.annotation.Autowired
    public ChatGptOAuthClient(ObjectMapper json){this(json,URI.create("https://auth.openai.com"));}
    ChatGptOAuthClient(ObjectMapper json,URI issuer){http=new ProviderHttp(json);this.issuer=issuer;}
    JsonNode exchange(String clientId,String code,String verifier,String redirect){return token(Map.of("grant_type","authorization_code","client_id",clientId,"code",code,"code_verifier",verifier,"redirect_uri",redirect,"resource",RESOURCE));}
    JsonNode refresh(String clientId,String refresh){return token(Map.of("grant_type","refresh_token","client_id",clientId,"refresh_token",refresh,"resource",RESOURCE));}
    private JsonNode token(Map<String,String> body) {
        return http.read(http.oauthRequest(issuer.resolve("/api/accounts/oauth/token"),
                form(body).getBytes(StandardCharsets.UTF_8)));
    }
    JsonNode validate(JsonNode tokens,String clientId,String nonce,String subject) {
        var discovery=http.read(http.request(issuer.resolve("/.well-known/openid-configuration"),"GET",null,null,null,65536));
        if(!"https://auth.openai.com".equals(discovery.path("issuer").asText()))throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");
        URI jwks=trusted(discovery.path("jwks_uri").asText());
        return ChatGptIdToken.verify(tokens.path("id_token").asText(),http.read(http.request(jwks,"GET",null,null,null,65536)),clientId,nonce,subject,http.json);
    }
    boolean revoke(String client,String token) {
        try {
            var discovery=http.read(http.request(issuer.resolve("/.well-known/openid-configuration"),"GET",null,null,null,65536));
            URI endpoint=trusted(discovery.path("revocation_endpoint").asText());
            http.request(endpoint,"POST",null,"application/x-www-form-urlencoded",form(Map.of("client_id",client,"token",token,"token_type_hint","refresh_token")).getBytes(StandardCharsets.UTF_8),65536);return true;
        }catch(OpenAiResponsesClient.Failure e){return false;}
    }
    private URI trusted(String value) {
        try {URI uri=URI.create(value);if(!Objects.equals(uri.getScheme(),issuer.getScheme())||!Objects.equals(uri.getHost(),issuer.getHost())||uri.getPort()!=issuer.getPort()||uri.getUserInfo()!=null||uri.getFragment()!=null)throw new IllegalArgumentException();return uri;}
        catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");}
    }
    static String form(Map<String,String> values){return values.entrySet().stream().map(e->URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="+URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(java.util.stream.Collectors.joining("&"));}
}
