package vn.syp.tms.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    interface AdminState {
        // MySQL returns this computed predicate as a number, not a JDBC BOOLEAN.
        @org.springframework.beans.factory.annotation.Value("#{target.archived != 0}")
        boolean getArchived();
    }
    @org.springframework.data.jpa.repository.Query(value="SELECT archived_at IS NOT NULL AS archived FROM projects WHERE id=:id FOR UPDATE",nativeQuery=true)
    java.util.Optional<AdminState> lockAdminState(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Project p where p.id = :id")
    java.util.Optional<Project> lockById(@org.springframework.data.repository.query.Param("id") Long id);
    Project findByCode(String code);
    boolean existsByCode(String code);
}
