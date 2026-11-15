package vn.syp.tms.workitem;

import java.util.*;
import java.nio.file.*;
import java.io.IOException;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import vn.syp.tms.attachment.EvidenceContent;
import static vn.syp.tms.workitem.WorkItemStore.*;

/** Files and the command share one transaction; retries cannot duplicate a comment. */
@Service
public class TicketAttachmentService {
    private final WorkItemStore db;private final FeatureIssueService issues;private final Path root;
    public TicketAttachmentService(WorkItemStore db,FeatureIssueService issues,@Value("${TMS_TICKET_ATTACHMENT_ROOT:./var/ticket-comments}") String root){this.db=db;this.issues=issues;this.root=Path.of(root).toAbsolutePath().normalize();}
    private record Prepared(String name,String type,byte[] bytes,String digest) {}
    public record Download(String name,String type,byte[] bytes) {}
    static List<Map<String,Object>> metadata(WorkItemStore db,long p,long id,long history){return db.rows("SELECT id,original_name AS name,media_type AS mediaType,byte_size AS size FROM ticket_comment_attachments WHERE project_id=? AND work_item_id=? AND history_id=? ORDER BY created_at,id",p,id,history);}
    @Transactional public Map<String,Object> submit(long p,String user,long id,FeatureIssueDtos.Action input,List<MultipartFile> files){
        issues.authorize(p,user,true);
        if(files==null||files.isEmpty()||files.size()>10)fail(422,"INVALID_FILES","Chọn từ 1 đến 10 tệp.");
        long total=files.stream().mapToLong(MultipartFile::getSize).sum();
        if(total>EvidenceContent.MAX_BYTES)fail(413,"FILE_TOO_LARGE","Tổng tệp đính kèm không vượt quá 20 MiB.");
        var prepared=new ArrayList<Prepared>();
        try{
            for(var file:files){String name=EvidenceContent.filename(file.getOriginalFilename());byte[] bytes=file.getBytes();String type=identify(bytes,name);prepared.add(new Prepared(name,type,bytes,digest(bytes)));}
        }catch(IOException e){throw new IllegalStateException("Cannot read ticket attachment",e);}
        input.attachmentDigest=db.checksum(prepared.stream().map(f->List.of(f.name(),f.type(),f.digest())).toList());input.attachmentCount=prepared.size();
        var result=issues.action(p,user,id,input);
        long history=db.count("SELECT history_id FROM ticket_commands WHERE project_id=? AND work_item_id=? AND request_key=?",p,id,input.requestKey().toString());
        if(!metadata(db,p,id,history).isEmpty())return result;
        for(var file:prepared){
            String fileId=UUID.randomUUID().toString();Path target=root.resolve(fileId);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)try{Files.deleteIfExists(target);}catch(IOException e){org.slf4j.LoggerFactory.getLogger(TicketAttachmentService.class).error("Cannot remove rolled-back attachment {}",fileId,e);}}});
            try{Files.createDirectories(root);Files.write(target,file.bytes(),StandardOpenOption.CREATE_NEW);}catch(IOException e){throw new IllegalStateException("Cannot save ticket attachment",e);}
            db.update("INSERT INTO ticket_comment_attachments(id,project_id,work_item_id,history_id,original_name,media_type,byte_size,sha256,uploaded_by_user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))",fileId,p,id,history,file.name(),file.type(),file.bytes().length,file.digest(),user);
        }
        return result;
    }
    @Transactional(readOnly=true) public Download download(long p,String user,long id,UUID attachment){
        issues.authorize(p,user,false);
        var row=db.row("SELECT original_name AS name,media_type AS mediaType FROM ticket_comment_attachments WHERE project_id=? AND work_item_id=? AND id=?",p,id,attachment.toString());
        try{return new Download(row.get("name").toString(),row.get("mediaType").toString(),Files.readAllBytes(root.resolve(attachment.toString())));}
        catch(IOException e){fail(404,"FILE_UNAVAILABLE","Tệp hiện không có trên máy chủ.");return null;}
    }
    private static String digest(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private static String identify(byte[] bytes,String name){
        String lower=name.toLowerCase(Locale.ROOT);
        if(bytes.length==0||bytes.length>EvidenceContent.MAX_BYTES)fail(413,"FILE_TOO_LARGE","Tệp phải có nội dung, tổng không quá 20 MiB.");
        if(lower.matches(".*\\.(txt|log|csv|json)$")){
            try{StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));}catch(java.nio.charset.CharacterCodingException e){fail(422,"INVALID_TEXT_FILE","Tệp văn bản cần mã hóa UTF-8.");}
            return "application/octet-stream";
        }
        if(lower.matches(".*\\.(xlsx|docx|zip)$")&&bytes.length>=4&&bytes[0]=='P'&&bytes[1]=='K'&&bytes[2]==3&&bytes[3]==4)return "application/octet-stream";
        return EvidenceContent.identify(bytes,name);
    }
}
