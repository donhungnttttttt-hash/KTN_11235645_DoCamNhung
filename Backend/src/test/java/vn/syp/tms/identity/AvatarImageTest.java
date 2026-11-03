package vn.syp.tms.identity;
import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import vn.syp.tms.shared.web.BusinessException;
class AvatarImageTest {
 @Test void rejectsImageDimensionsBeforeDecodingPixels()throws Exception{
  var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(4097,1,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",output);
  assertThatThrownBy(()->AvatarImage.normalize(new MockMultipartFile("file","wide.png","image/png",output.toByteArray()))).isInstanceOf(BusinessException.class).hasMessageContaining("4096");
 }
 @Test void rejectsNonRasterContentAndEmptyUpload(){
  assertThatThrownBy(()->AvatarImage.normalize(new MockMultipartFile("file","script.png","image/png","<script/>".getBytes(java.nio.charset.StandardCharsets.UTF_8)))).isInstanceOf(BusinessException.class);
  assertThatThrownBy(()->AvatarImage.normalize(new MockMultipartFile("file","empty.png","image/png",new byte[0]))).isInstanceOf(BusinessException.class);
 }
}
