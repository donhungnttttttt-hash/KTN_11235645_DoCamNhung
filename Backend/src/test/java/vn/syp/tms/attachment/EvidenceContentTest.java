package vn.syp.tms.attachment;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import vn.syp.tms.shared.web.BusinessException;

class EvidenceContentTest {
    @Test void rejectsEmptyOversizedMisnamedAndActiveContent() {
        for(byte[] bytes:new byte[][]{new byte[0],new byte[EvidenceContent.MAX_BYTES+1]}) assertThatThrownBy(()->EvidenceContent.identify(bytes,"proof.png")).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(413));
        for(String content:new String[]{"<html>not a photo</html>","%PDF-1.7\n/JavaScript (bad)\n%%EOF","%PDF-1.7 unfinished"})
            assertThatThrownBy(()->EvidenceContent.identify(content.getBytes(StandardCharsets.US_ASCII),"proof.pdf")).isInstanceOfSatisfying(BusinessException.class,e->assertThat(e.status()).isEqualTo(422));
        assertThatThrownBy(()->EvidenceContent.filename("\r\n")).isInstanceOf(BusinessException.class);
        assertThat(EvidenceContent.filename("C:\\fakepath\\ảnh.png")).isEqualTo("ảnh.png");
    }
    @Test void detectsJpegPngPdfAndMp4ByContentInsteadOfClientMime() throws Exception {
        for(String format:new String[]{"png","jpeg"}) {
            var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),format,output);
            assertThat(EvidenceContent.identify(output.toByteArray(),"proof."+format)).isEqualTo("image/"+format);
        }
        assertThat(EvidenceContent.identify("%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF".getBytes(),"proof.pdf")).isEqualTo("application/pdf");
        byte[] mp4=new byte[24];mp4[3]=24;System.arraycopy("ftypisom".getBytes(),0,mp4,4,8);
        assertThat(EvidenceContent.identify(mp4,"proof.mp4")).isEqualTo("video/mp4");
        mp4[3]=100;assertThatThrownBy(()->EvidenceContent.identify(mp4,"proof.mp4")).isInstanceOf(BusinessException.class);
    }
    @Test void rejectsTruncatedImagesWrongExtensionsInvalidBrandsAndFilenames() throws Exception {
        for(String name:new String[]{null,"","x".repeat(256)}) assertThatThrownBy(()->EvidenceContent.filename(name)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->EvidenceContent.identify(new byte[]{(byte)137,80,78,71,13,10,26,10},"proof.png")).isInstanceOf(BusinessException.class);
        var output=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"jpeg",output);
        byte[] jpeg=output.toByteArray();assertThat(EvidenceContent.identify(jpeg,"proof.jpg")).isEqualTo("image/jpeg");
        assertThatThrownBy(()->EvidenceContent.identify(jpeg,"proof.png")).isInstanceOf(BusinessException.class);
        jpeg[jpeg.length-1]=0;assertThatThrownBy(()->EvidenceContent.identify(jpeg,"proof.jpeg")).isInstanceOf(BusinessException.class);
        byte[] mp4=new byte[24];mp4[3]=24;System.arraycopy("ftypbad!".getBytes(),0,mp4,4,8);
        assertThatThrownBy(()->EvidenceContent.identify(mp4,"proof.mp4")).isInstanceOf(BusinessException.class);
        mp4[3]=8;assertThatThrownBy(()->EvidenceContent.identify(mp4,"proof.mp4")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(()->EvidenceContent.identify(new byte[]{1},"proof.png")).isInstanceOf(BusinessException.class);
    }
}
