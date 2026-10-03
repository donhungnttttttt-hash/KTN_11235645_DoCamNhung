package vn.syp.tms.workitem;

import org.springframework.lang.NonNull;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Component;
import vn.syp.tms.shared.web.BusinessException;

/** SQL stays parameterized; dates stored as UTC are exposed with an explicit offset. */
@Component
public class WorkItemStore {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    public WorkItemStore(JdbcTemplate db,ObjectMapper json) { this.db=db; this.json=json; }
    public List<Map<String,Object>> rows(@NonNull String sql,Object...args) {
        var rows=db.queryForList(sql,args);
        rows.forEach(row->row.replaceAll((key,value)->value instanceof LocalDateTime time ? time.toInstant(ZoneOffset.UTC) : value));
        return rows;
    }
    public Map<String,Object> row(@NonNull String sql,Object...args) {
        var rows=rows(sql,args);
        if(rows.isEmpty()) fail(404,"NOT_FOUND","Không tìm thấy dữ liệu trong dự án.");
        return rows.getFirst();
    }
    public long count(@NonNull String sql,Object...args) { return Objects.requireNonNull(db.queryForObject(sql,Long.class,args)); }
    public int update(@NonNull String sql,Object...args) { return db.update(sql,args); }
    public long insert(@NonNull String sql,Object...args) {
        var keys=new GeneratedKeyHolder();
        db.update(connection->{var statement=Objects.requireNonNull(connection.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS));
            for(int i=0;i<args.length;i++) statement.setObject(i+1,args[i]); return statement;},keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }
    public String encode(Object value) { try { return json.writeValueAsString(value); } catch(Exception e) { throw new IllegalStateException("Cannot encode work item metadata",e); } }
    public String checksum(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(value).getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public static long number(Map<String,Object> row,String key) { return ((Number)row.get(key)).longValue(); }
    public static String text(String value) { return value==null?"":value.trim(); }
    public static void required(String value,String label) { if(text(value).isEmpty()) fail(422,"REQUIRED_FIELD","Vui lòng nhập "+label+"."); }
    public static void version(Map<String,Object> row,Long expected) { if(expected==null || number(row,"version")!=expected) fail(409,"VERSION_CONFLICT","Dữ liệu đã thay đổi. Tải lại để đối chiếu; bản nháp vẫn được giữ."); }
    public static void fail(int status,String code,String message) { throw new BusinessException(status,code,message); }
}
