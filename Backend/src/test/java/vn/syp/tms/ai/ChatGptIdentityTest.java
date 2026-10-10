package vn.syp.tms.ai;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class ChatGptIdentityTest {
    final ObjectMapper json=new ObjectMapper();
    @Test void validatesSignatureAudienceIssuerExpiryNonceAndRejectsSubstitution() throws Exception {
        var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);var pair=generator.generateKeyPair();
        var jwks=json.createObjectNode();var key=jwks.putArray("keys").addObject().put("kty","RSA").put("kid","test").put("alg","RS256").put("use","sig");
        var rsa=(RSAPublicKey)pair.getPublic();key.put("n",encode(rsa.getModulus().toByteArray())).put("e",encode(rsa.getPublicExponent().toByteArray()));
        var payload=json.createObjectNode().put("iss","https://auth.openai.com").put("aud","oaiapp_test").put("sub","subject").put("nonce","nonce").put("exp",Instant.now().plusSeconds(300).getEpochSecond());
        String token=sign(pair,payload);
        assertThat(ChatGptIdToken.verify(token,jwks,"oaiapp_test","nonce",null,json).path("sub").asText()).isEqualTo("subject");
        assertThatThrownBy(()->ChatGptIdToken.verify(token,jwks,"other","nonce",null,json)).hasMessage("AI_AUTH_FAILED");
        assertThatThrownBy(()->ChatGptIdToken.verify(token,jwks,"oaiapp_test","wrong",null,json)).hasMessage("AI_AUTH_FAILED");
        assertThatThrownBy(()->ChatGptIdToken.verify(token,jwks,"oaiapp_test","nonce","other-subject",json)).hasMessage("AI_AUTH_FAILED");
        payload.put("iss","https://evil.invalid");String wrongIssuer=sign(pair,payload);
        assertThatThrownBy(()->ChatGptIdToken.verify(wrongIssuer,jwks,"oaiapp_test","nonce",null,json)).hasMessage("AI_AUTH_FAILED");
        payload.put("iss","https://auth.openai.com").put("exp",0);String expired=sign(pair,payload);
        assertThatThrownBy(()->ChatGptIdToken.verify(expired,jwks,"oaiapp_test","nonce",null,json)).hasMessage("AI_AUTH_FAILED");
        var attacker=generator.generateKeyPair();payload.put("exp",Instant.now().plusSeconds(300).getEpochSecond());String forged=sign(attacker,payload);
        assertThatThrownBy(()->ChatGptIdToken.verify(forged,jwks,"oaiapp_test","nonce",null,json)).hasMessage("AI_AUTH_FAILED");
    }
    private String sign(KeyPair key,JsonNode claims)throws Exception {
        String body=encode("{\"alg\":\"RS256\",\"kid\":\"test\"}".getBytes(StandardCharsets.UTF_8))+"."+encode(json.writeValueAsBytes(claims));
        Signature signer=Signature.getInstance("SHA256withRSA");signer.initSign(key.getPrivate());signer.update(body.getBytes(StandardCharsets.US_ASCII));return body+"."+encode(signer.sign());
    }
    private static String encode(byte[] data){return Base64.getUrlEncoder().withoutPadding().encodeToString(data);}
}
