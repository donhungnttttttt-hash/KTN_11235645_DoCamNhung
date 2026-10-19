package vn.syp.tms.notes;

import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ProjectNotesStore {
    private final JdbcTemplate db;
    private static final RowMapper<ProjectNote> MAP=(r,n)->new ProjectNote(r.getLong("id"),r.getLong("project_id"),r.getString("title"),r.getString("body"),r.getLong("lock_version"),r.getString("created_by"),r.getString("updated_by"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
    public ProjectNotesStore(JdbcTemplate db){this.db=db;}
    public long count(long project){return Objects.requireNonNull(db.queryForObject("SELECT COUNT(*) FROM project_notes WHERE project_id=? AND archived_at IS NULL",Long.class,project));}
    public List<ProjectNote> list(long project,int size,long offset){return db.query("SELECT * FROM project_notes WHERE project_id=? AND archived_at IS NULL ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?",MAP,project,size,offset);}
    public ProjectNote get(long project,long id,boolean lock){
        var rows=db.query("SELECT * FROM project_notes WHERE project_id=? AND id=? AND archived_at IS NULL"+(lock?" FOR UPDATE":""),MAP,project,id);
        return rows.isEmpty()?null:rows.getFirst();
    }
    public long create(long project,String actor,String title,String body){
        var key=new GeneratedKeyHolder();
        db.update(connection->{var statement=connection.prepareStatement("INSERT INTO project_notes(project_id,title,body,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",Statement.RETURN_GENERATED_KEYS);statement.setLong(1,project);statement.setString(2,title);statement.setString(3,body);statement.setString(4,actor);statement.setString(5,actor);return statement;},key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
    public int update(long project,long id,String actor,String title,String body,long version){return db.update("UPDATE project_notes SET title=?,body=?,updated_by=?,updated_at=UTC_TIMESTAMP(6),lock_version=lock_version+1 WHERE project_id=? AND id=? AND lock_version=? AND archived_at IS NULL",title,body,actor,project,id,version);}
    public int archive(long project,long id,String actor,long version){return db.update("UPDATE project_notes SET archived_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6),updated_by=?,lock_version=lock_version+1 WHERE project_id=? AND id=? AND lock_version=? AND archived_at IS NULL",actor,project,id,version);}
}
