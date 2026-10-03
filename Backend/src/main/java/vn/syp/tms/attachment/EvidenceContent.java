package vn.syp.tms.attachment;

import static vn.syp.tms.workitem.WorkItemStore.fail;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.imageio.ImageIO;

/** Content identification, not a malware scanner. Downloads are never rendered inline. */
public final class EvidenceContent {
    public static final int MAX_BYTES=20*1024*1024;
    private EvidenceContent() {}
    public static String identify(byte[] bytes,String filename) {
        if(bytes.length==0 || bytes.length>MAX_BYTES) fail(413,"FILE_TOO_LARGE","Chứng cứ phải có nội dung và không vượt quá 20 MiB.");
        String lower=filename.toLowerCase(Locale.ROOT);
        if(starts(bytes,new byte[]{(byte)137,80,78,71,13,10,26,10}) && lower.endsWith(".png")) { image(bytes,"png"); return "image/png"; }
        if(bytes.length>4 && (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[bytes.length-2]&255)==255 && (bytes[bytes.length-1]&255)==217 && (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))) { image(bytes,"jpeg");return "image/jpeg"; }
        if(starts(bytes,"%PDF-".getBytes(StandardCharsets.US_ASCII)) && lower.endsWith(".pdf")) {
            String content=new String(bytes,StandardCharsets.ISO_8859_1);
            if(!content.substring(Math.max(0,content.length()-1024)).contains("%%EOF") || content.matches("(?s).*/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction)\\b.*")) fail(422,"ACTIVE_CONTENT","Không nhận PDF chứa thao tác tự chạy hoặc tệp nhúng.");
            return "application/pdf";
        }
        if(bytes.length>=24 && lower.endsWith(".mp4") && new String(bytes,4,4,StandardCharsets.US_ASCII).equals("ftyp")) {
            long box=((bytes[0]&255L)<<24)|((bytes[1]&255L)<<16)|((bytes[2]&255L)<<8)|(bytes[3]&255L);
            String brand=new String(bytes,8,4,StandardCharsets.US_ASCII);
            if(box>=16 && box<=bytes.length && Set.of("isom","iso2","mp41","mp42","avc1","M4V ","MSNV","dash").contains(brand)) return "video/mp4";
        }
        fail(422,"INVALID_FILE_TYPE","Chỉ nhận nội dung PNG, JPG, PDF hoặc MP4 đúng với đuôi tệp.");return "";
    }
    private static boolean starts(byte[] value,byte[] prefix) {
        if(value.length<prefix.length) return false;
        for(int i=0;i<prefix.length;i++) if(value[i]!=prefix[i]) return false;
        return true;
    }
    private static void image(byte[] bytes,String format) {
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(input);
            if(!readers.hasNext()) throw new IOException();
            var reader=readers.next();
            try {
                reader.setInput(input);
                long width=reader.getWidth(0),height=reader.getHeight(0);
                if(!reader.getFormatName().equalsIgnoreCase(format) || width<1 || height<1 || width*height>40_000_000) throw new IOException();
                if(reader.read(0)==null) throw new IOException();
            } finally { reader.dispose(); }
        } catch(IOException | RuntimeException e) { fail(422,"INVALID_IMAGE","Ảnh không hợp lệ hoặc vượt giới hạn xử lý 40 megapixel."); }
    }
    public static String filename(String original) {
        String name=original==null?"":original.replace('\\','/'); name=name.substring(name.lastIndexOf('/')+1);
        name=name.replaceAll("[\\p{Cntrl}]","").trim();
        if(name.isEmpty() || name.length()>255) fail(422,"INVALID_FILENAME","Tên tệp không hợp lệ."); return name;
    }
}
