package vn.syp.tms.reporting;

import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Both translations belong to the same evidence revision. Legacy plain text is not bilingual. */
final class HealthAdviceLanguages {
 private static final ObjectMapper JSON=new ObjectMapper();
 private HealthAdviceLanguages(){}
 static Map<String,String> read(Object raw){
  if(!(raw instanceof String value)||value.length()>16000)return Map.of();
  try{
   var node=JSON.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(value);
   if(node==null||!node.isObject()||node.size()!=2||!node.path("ja").isTextual()||!node.path("vi").isTextual())return Map.of();
   String ja=node.path("ja").asText().strip(),vi=node.path("vi").asText().strip();
   if(!safe(ja)||!safe(vi)||!ja.matches("(?s).*[\\p{IsHiragana}\\p{IsKatakana}].*")||vi.matches("(?s).*[\\p{IsHiragana}\\p{IsKatakana}].*"))return Map.of();
   return Map.of("ja",ja,"vi",vi);
  }catch(java.io.IOException invalid){return Map.of();}
 }
 static String validated(String raw){
  var texts=read(raw);if(texts.isEmpty())return null;
  try{return JSON.writeValueAsString(texts);}catch(java.io.IOException invalid){return null;}
 }
 private static boolean safe(String text){return !text.isBlank()&&text.length()<=1200&&!text.contains("<")&&!text.toLowerCase(java.util.Locale.ROOT).contains("http");}
}
