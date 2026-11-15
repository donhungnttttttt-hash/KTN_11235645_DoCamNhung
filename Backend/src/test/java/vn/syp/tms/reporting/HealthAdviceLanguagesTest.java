package vn.syp.tms.reporting;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class HealthAdviceLanguagesTest {
 @Test void readsBothLanguagesWithoutChangingNumbers(){
  var pair=HealthAdviceLanguages.read("{\"ja\":\"NGの29ケースを確認してください。\",\"vi\":\"Xác minh 29 case NG.\"}");
  assertThat(pair).containsEntry("ja","NGの29ケースを確認してください。").containsEntry("vi","Xác minh 29 case NG.");
  assertThat(HealthAdviceLanguages.read(HealthAdviceLanguages.validated("{\"ja\":\" 確認してください。 \",\"vi\":\" Xác minh. \"}"))).containsEntry("vi","Xác minh.");
 }
 @Test void rejectsLegacyPartialWrongLanguageMarkupAndTrailingPayload(){
  for(String value:new String[]{"Old Vietnamese","{\"vi\":\"Xác minh.\"}","{\"ja\":\"Xác minh.\",\"vi\":\"Xác minh.\"}","{\"ja\":\"確認してください。\",\"vi\":\"<script>\"}","{\"ja\":\"確認してください。\",\"vi\":\"Xác minh.\"} {}","{\"ja\":\"確認してください。\",\"vi\":\"http://example.test\"}"})assertThat(HealthAdviceLanguages.validated(value)).as(value).isNull();
  assertThat(HealthAdviceLanguages.read(null)).isEmpty();
 }
}
