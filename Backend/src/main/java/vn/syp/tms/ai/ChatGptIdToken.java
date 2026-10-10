package vn.syp.tms.ai;

import com.fasterxml.jackson.databind.*;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.RSAPublicKeySpec;
import java.time.Instant;
import java.util.Base64;

/** Strict RS256 verifier using only the fixed issuer's JWKS; never trusts JWT-supplied URLs. */
final class ChatGptIdToken {
    static JsonNode verify(String token,JsonNode jwks,String audience,String nonce,String subject,ObjectMapper json) {
        try {
            if(token==null||token.length()>16384)throw new IllegalArgumentException();
            String[] parts=token.split("\\.",-1);if(parts.length!=3)throw new IllegalArgumentException();
            var decoder=Base64.getUrlDecoder();var header=json.readTree(decoder.decode(parts[0]));var claims=json.readTree(decoder.decode(parts[1]));
            if(!"RS256".equals(header.path("alg").asText())||!header.path("kid").isTextual()||header.has("crit"))throw new IllegalArgumentException();
            JsonNode match=null;
            for(var key:jwks.path("keys"))if(key.path("kid").asText().equals(header.path("kid").asText())&&"RSA".equals(key.path("kty").asText())
                    &&(!key.has("use")||"sig".equals(key.path("use").asText()))&&(!key.has("alg")||"RS256".equals(key.path("alg").asText()))) {if(match!=null)throw new IllegalArgumentException();match=key;}
            if(match==null)throw new IllegalArgumentException();
            BigInteger modulus=new BigInteger(1,decoder.decode(match.path("n").asText()));if(modulus.bitLength()<2048)throw new IllegalArgumentException();
            var key=KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(modulus,new BigInteger(1,decoder.decode(match.path("e").asText()))));
            var verifier=Signature.getInstance("SHA256withRSA");verifier.initVerify(key);verifier.update((parts[0]+"."+parts[1]).getBytes(StandardCharsets.US_ASCII));
            if(!verifier.verify(decoder.decode(parts[2])))throw new IllegalArgumentException();
            long now=Instant.now().getEpochSecond();
            boolean aud=claims.path("aud").isTextual()&&audience.equals(claims.path("aud").asText());
            if(claims.path("aud").isArray()){for(var a:claims.path("aud"))if(audience.equals(a.asText()))aud=true;if(claims.path("aud").size()>1&&!audience.equals(claims.path("azp").asText()))aud=false;}
            if(!aud||(claims.has("azp")&&!audience.equals(claims.path("azp").asText()))||!"https://auth.openai.com".equals(claims.path("iss").asText())||!claims.path("exp").isIntegralNumber()||claims.path("exp").asLong()<=now
                    ||(claims.has("nbf")&&claims.path("nbf").asLong()>now+30)||(claims.has("iat")&&claims.path("iat").asLong()>now+30)
                    ||(nonce!=null&&!nonce.equals(claims.path("nonce").asText()))||!claims.path("sub").isTextual()||claims.path("sub").asText().isBlank()
                    ||(subject!=null&&!subject.equals(claims.path("sub").asText())))throw new IllegalArgumentException();
            return claims;
        }catch(Exception e){throw new OpenAiResponsesClient.Failure("AI_AUTH_FAILED");}
    }
}
