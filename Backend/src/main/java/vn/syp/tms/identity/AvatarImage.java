package vn.syp.tms.identity;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.shared.web.BusinessException;

/** Decode bounded JPEG/PNG and re-encode pixels only, excluding uploaded metadata. */
public final class AvatarImage {
 private AvatarImage() {}
 public static byte[] normalize(MultipartFile file){
  if(file.isEmpty()||file.getSize()>2L*1024*1024)throw invalid("Ảnh phải có nội dung và không vượt quá 2 MiB.");
  if(!"image/png".equals(file.getContentType())&&!"image/jpeg".equals(file.getContentType()))throw invalid("Chọn ảnh PNG hoặc JPEG.");
  try(var input=new MemoryCacheImageInputStream(file.getInputStream())){
   var readers=ImageIO.getImageReaders(input);if(!readers.hasNext())throw invalid("Nội dung ảnh không hợp lệ.");
   var reader=readers.next();
   try{
    String format=reader.getFormatName().toLowerCase(Locale.ROOT);
    if(!format.equals("png")&&!format.equals("jpeg")&&!format.equals("jpg"))throw invalid("Chọn ảnh PNG hoặc JPEG.");
    reader.setInput(input,true,true);int width=reader.getWidth(0),height=reader.getHeight(0);
    if(width<1||height<1||width>4096||height>4096)throw invalid("Ảnh có kích thước tối đa 4096 × 4096 pixel.");
    var source=reader.read(0);double scale=Math.min(1,512.0/Math.max(width,height));
    var normalized=new BufferedImage(Math.max(1,(int)Math.round(width*scale)),Math.max(1,(int)Math.round(height*scale)),BufferedImage.TYPE_INT_ARGB);
    var graphics=normalized.createGraphics();try{graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);graphics.drawImage(source,0,0,normalized.getWidth(),normalized.getHeight(),null);}finally{graphics.dispose();}
    var output=new ByteArrayOutputStream();if(!ImageIO.write(normalized,"png",output))throw invalid("Không đọc được ảnh.");
    return output.toByteArray();
   }finally{reader.dispose();}
  }catch(IOException|IllegalArgumentException failure){throw invalid("Nội dung ảnh không hợp lệ. Chọn ảnh PNG hoặc JPEG khác.");}
 }
 private static BusinessException invalid(String message){return new BusinessException(422,"INVALID_AVATAR",message);}
}
